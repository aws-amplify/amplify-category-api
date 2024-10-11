import {
  AppSyncAuthConfiguration,
  GraphQLAPIProvider,
  TransformerPluginProvider,
  TransformHostProvider,
  TransformerLog,
  NestedStackProvider,
  SynthParameters,
} from '@aws-amplify/graphql-transformer-interfaces';
import type {
  AssetProvider,
  StackManagerProvider,
  TransformParameterProvider,
  TransformParameters,
  DataSourceStrategiesProvider,
  RDSLayerMappingProvider,
  RDSSNSTopicMappingProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { AuthorizationMode, AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import { Aws, CfnOutput, Fn, Stack } from 'aws-cdk-lib';
import {
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  parse,
  ScalarTypeDefinitionNode,
  TypeDefinitionNode,
  TypeExtensionNode,
  UnionTypeDefinitionNode,
} from 'graphql';
import _ from 'lodash';
import { DocumentNode } from 'graphql/language';
import { Construct } from 'constructs';
import { ResolverConfig } from '../config/transformer-config';
import { InvalidTransformerError, SchemaValidationError, UnknownDirectiveError } from '../errors';
import { GraphQLApi } from '../graphql-api';
import { TransformerContext, NONE_DATA_SOURCE_NAME } from '../transformer-context';
import { TransformerOutput } from '../transformer-context/output';
import { adoptAuthModes } from '../utils/authType';
import { MappingTemplate } from '../cdk-compat';
import { TransformerPreProcessContext } from '../transformer-context/pre-process-context';
import { defaultTransformParameters } from '../transformer-context/transform-parameters';
import * as SyncUtils from './sync-utils';
import { UserDefinedSlot } from './types';
import {
  makeSeenTransformationKey,
  matchArgumentDirective,
  matchDirective,
  matchEnumValueDirective,
  matchFieldDirective,
  matchInputFieldDirective,
  sortTransformerPlugins,
} from './utils';
import { validateAuthModes, validateModelSchema } from './validation';

/**
 * Returns whether typeof the provided object is function.
 * @param obj the object to test
 * @returns whether or not it passes a 'function' test.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
const isFunction = (obj: any): obj is Function => obj && typeof obj === 'function';

type TypeDefinitionOrExtension = TypeDefinitionNode | TypeExtensionNode;

/**
 * A generic transformation library that takes as input a graphql schema
 * written in SDL and a set of transformers that operate on it. At the
 * end of a transformation, a fully specified cloudformation template
 * is emitted.
 */
export interface GraphQLTransformOptions {
  readonly transformers: TransformerPluginProvider[];
  // Override the formatters stack mapping. This is useful when handling
  // migrations as all the input/export/ref/getAtt changes will be made
  // automatically.
  readonly stackMapping?: StackMapping;
  // transform config which can change the behavior of the transformer
  readonly authConfig?: AppSyncAuthConfiguration;
  readonly transformParameters?: Partial<TransformParameters>;
  readonly host?: TransformHostProvider;
  readonly userDefinedSlots?: Record<string, UserDefinedSlot[]>;
  readonly resolverConfig?: ResolverConfig;
}

export interface TransformOption extends DataSourceStrategiesProvider, RDSLayerMappingProvider, RDSSNSTopicMappingProvider {
  scope: Construct;
  nestedStackProvider: NestedStackProvider;
  parameterProvider?: TransformParameterProvider;
  assetProvider: AssetProvider;
  synthParameters: SynthParameters;
  schema: string;
}

export type StackMapping = { [resourceId: string]: string };

export class GraphQLTransform {
  private transformers: TransformerPluginProvider[];

  private stackMappingOverrides: StackMapping;

  private readonly authConfig: AppSyncAuthConfiguration;

  private readonly resolverConfig?: ResolverConfig;

  private readonly userDefinedSlots: Record<string, UserDefinedSlot[]>;

  private readonly transformParameters: TransformParameters;

  // A map from `${directive}.${typename}.${fieldName?}`: true
  // that specifies we have run already run a directive at a given location.
  // Only run a transformer function once per pair. This is refreshed each call to transform().
  private seenTransformations: { [k: string]: boolean } = {};

  private logs: TransformerLog[];

  constructor(private readonly options: GraphQLTransformOptions) {
    if (!options.transformers || options.transformers.length === 0) {
      throw new Error('Must provide at least one transformer.');
    }
    const sortedTransformers = sortTransformerPlugins(options.transformers);
    this.transformers = sortedTransformers;

    this.authConfig = options.authConfig || {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
        apiKeyConfig: {
          apiKeyExpirationDays: 7,
          description: 'Default API Key',
        },
      },
      additionalAuthenticationProviders: [],
    };

    validateAuthModes(this.authConfig);

    this.stackMappingOverrides = options.stackMapping || {};
    this.userDefinedSlots = options.userDefinedSlots || ({} as Record<string, UserDefinedSlot[]>);
    this.resolverConfig = options.resolverConfig || {};
    this.transformParameters = {
      ...defaultTransformParameters,
      ...(options.transformParameters ?? {}),
    };

    this.logs = [];
  }

  /**
   * Processes the schema using the transformer plugins that have exposed pre-process lifecycle methods
   * The transformation step is focused on taking the schema and boiling it down into metadata which can
   * then be 'transformed' into Cloud resources for the purpose of runtime use by applications. The pre-process
   * lifecycle holds the logic for making any modifications to the schema (i.e. adding fields)
   *
   * One example of an added field: a @hasMany connection will add a field to the target model to ensure
   * that the relationship can be resolved at runtime by storing the source model's primary key
   * @param schema A parsed GraphQL DocumentNode
   */
  public preProcessSchema(schema: DocumentNode): DocumentNode {
    const context = new TransformerPreProcessContext(schema, this.transformParameters);

    this.transformers
      .filter((transformer) => isFunction(transformer.preMutateSchema))
      .forEach((transformer) => transformer.preMutateSchema && transformer.preMutateSchema(context));

    return this.transformers
      .filter((transformer) => isFunction(transformer.mutateSchema))
      .reduce((mutateContext, transformer) => {
        const updatedInputDocument = transformer.mutateSchema ? transformer.mutateSchema(mutateContext) : mutateContext.inputDocument;
        return {
          ...mutateContext,
          inputDocument: updatedInputDocument,
        };
      }, context).inputDocument;
  }

  /**
   * Reduces the final context by running the set of transformers on
   * the schema. Each transformer returns a new context that is passed
   * on to the next transformer. At the end of the transformation a
   * cloudformation template is returned.
   */
  public transform({
    assetProvider,
    dataSourceStrategies,
    nestedStackProvider,
    parameterProvider,
    rdsLayerMapping,
    rdsSnsTopicMapping,
    schema,
    scope,
    sqlDirectiveDataSourceStrategies,
    synthParameters,
  }: TransformOption): void {
    this.seenTransformations = {};
    const parsedDocument = parse(schema);
    const context = new TransformerContext({
      assetProvider,
      authConfig: this.authConfig,
      dataSourceStrategies: dataSourceStrategies,
      inputDocument: parsedDocument,
      nestedStackProvider,
      parameterProvider,
      rdsLayerMapping,
      rdsSnsTopicMapping,
      resolverConfig: this.resolverConfig,
      scope,
      sqlDirectiveDataSourceStrategies: sqlDirectiveDataSourceStrategies ?? [],
      stackMapping: this.stackMappingOverrides,
      synthParameters,
      transformParameters: this.transformParameters,
    });
    const validDirectiveNameMap = this.transformers.reduce(
      (acc: any, t: TransformerPluginProvider) => ({ ...acc, [t.directive.name.value]: true }),
      {
        aws_subscribe: true,
        aws_auth: true,
        aws_api_key: true,
        aws_iam: true,
        aws_oidc: true,
        aws_lambda: true,
        aws_cognito_user_pools: true,
        deprecated: true,
      },
    );
    let allModelDefinitions = [...context.inputDocument.definitions];
    for (const transformer of this.transformers) {
      allModelDefinitions = allModelDefinitions.concat(...transformer.typeDefinitions, transformer.directive);
    }

    // Option 1. Add a preprocess step that corrects the schema before initial validation.
    for (const transformer of this.transformers) {
      if (isFunction(transformer.preValidateSchema)) {
        transformer.preValidateSchema(context);
      }
    }

    const errors = validateModelSchema({
      kind: Kind.DOCUMENT,
      definitions: allModelDefinitions,
    });
    if (errors && errors.length) {
      throw new SchemaValidationError(errors);
    }

    for (const transformer of this.transformers) {
      if (isFunction(transformer.before)) {
        transformer.before(context);
      }
    }

    // Apply each transformer and accumulate the context.
    for (const transformer of this.transformers) {
      for (const def of context.inputDocument.definitions as TypeDefinitionOrExtension[]) {
        switch (def.kind) {
          case 'ObjectTypeDefinition':
            this.transformObject(transformer, def, validDirectiveNameMap, context);
            // Walk the fields and call field transformers.
            break;
          case 'InterfaceTypeDefinition':
            this.transformInterface(transformer, def, validDirectiveNameMap, context);
            // Walk the fields and call field transformers.
            break;
          case 'ScalarTypeDefinition':
            this.transformScalar(transformer, def, validDirectiveNameMap, context);
            break;
          case 'UnionTypeDefinition':
            this.transformUnion(transformer, def, validDirectiveNameMap, context);
            break;
          case 'EnumTypeDefinition':
            this.transformEnum(transformer, def, validDirectiveNameMap, context);
            break;
          case 'InputObjectTypeDefinition':
            this.transformInputObject(transformer, def, validDirectiveNameMap, context);
            break;
          default:
            // eslint-disable-next-line no-continue
            continue;
        }
      }
    }

    // Validate
    for (const transformer of this.transformers) {
      if (isFunction(transformer.validate)) {
        transformer.validate(context);
      }
    }

    // Prepare
    for (const transformer of this.transformers) {
      if (isFunction(transformer.prepare)) {
        transformer.prepare(context);
      }
    }

    // transform schema
    for (const transformer of this.transformers) {
      if (isFunction(transformer.transformSchema)) {
        transformer.transformSchema(context);
      }
    }

    // Synth the API and make it available to allow transformer plugins to manipulate the API
    const output: TransformerOutput = context.output as TransformerOutput;
    const api = this.generateGraphQlApi(
      context.stackManager,
      context.assetProvider,
      context.synthParameters,
      output,
      context.transformParameters,
    );

    // generate resolvers
    (context as TransformerContext).bind(api);
    if (!_.isEmpty(this.resolverConfig)) {
      SyncUtils.createSyncTable(context);
    }
    for (const transformer of this.transformers) {
      if (isFunction(transformer.generateResolvers)) {
        transformer.generateResolvers(context);
      }
    }

    // .transform() is meant to behave like a composition so the
    // after functions are called in the reverse order (as if they were popping off a stack)
    let reverseThroughTransformers = this.transformers.length - 1;
    while (reverseThroughTransformers >= 0) {
      const transformer = this.transformers[reverseThroughTransformers];
      if (isFunction(transformer.after)) {
        transformer.after(context);
      }
      reverseThroughTransformers -= 1;
    }
    for (const transformer of this.transformers) {
      if (isFunction(transformer.getLogs)) {
        const logs = transformer.getLogs();
        this.logs.push(...logs);
      }
    }
    this.collectResolvers(context, context.api);
    this.ensureNoneDataSource(context.api);
  }

  protected generateGraphQlApi(
    stackManager: StackManagerProvider,
    assetProvider: AssetProvider,
    synthParameters: SynthParameters,
    output: TransformerOutput,
    transformParameters: TransformParameters,
  ): GraphQLApi {
    // Todo: Move this to its own transformer plugin to support modifying the API
    // Like setting the auth mode and enabling logging and such

    const { scope } = stackManager;
    const authorizationConfig = adoptAuthModes(stackManager, synthParameters, this.authConfig);
    const apiName = synthParameters.apiName;
    const env = synthParameters.amplifyEnvironmentName;
    // N.B. changing the GraphqlApi Name is a 'No Interruptions' action,
    // so theoretically this optional env suffix behavior should be safe to apply retroactively to CLI users.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-graphqlapi.html#aws-resource-appsync-graphqlapi-properties
    const name = env === 'NONE' ? apiName : `${apiName}-${env}`;
    const api = new GraphQLApi(scope, 'GraphQLAPI', {
      name,
      authorizationConfig,
      host: this.options.host,
      sandboxModeEnabled: this.transformParameters.sandboxModeEnabled,
      environmentName: env,
      disableResolverDeduping: this.transformParameters.disableResolverDeduping,
      assetProvider,
    });
    const authModes = [authorizationConfig.defaultAuthorization, ...(authorizationConfig.additionalAuthorizationModes || [])].map(
      (mode) => mode?.authorizationType,
    );

    if (authModes.includes(AuthorizationType.API_KEY) && !this.transformParameters.suppressApiKeyGeneration) {
      const apiKeyConfig: AuthorizationMode | undefined = [
        authorizationConfig.defaultAuthorization,
        ...(authorizationConfig.additionalAuthorizationModes || []),
      ].find((auth) => auth?.authorizationType === AuthorizationType.API_KEY);
      const apiKeyDescription = apiKeyConfig!.apiKeyConfig?.description;
      const apiKeyExpirationDays = apiKeyConfig!.apiKeyConfig?.expires;

      const apiKey = api.createAPIKey({
        description: apiKeyDescription,
        expires: apiKeyExpirationDays,
      });

      if (transformParameters.enableTransformerCfnOutputs) {
        new CfnOutput(Stack.of(scope), 'GraphQLAPIKeyOutput', {
          value: apiKey.attrApiKey,
          description: 'Your GraphQL API ID.',
          exportName: Fn.join(':', [Aws.STACK_NAME, 'GraphQLApiKey']),
        });
      }
    }

    if (transformParameters.enableTransformerCfnOutputs) {
      new CfnOutput(Stack.of(scope), 'GraphQLAPIIdOutput', {
        value: api.apiId,
        description: 'Your GraphQL API ID.',
        exportName: Fn.join(':', [Aws.STACK_NAME, 'GraphQLApiId']),
      });

      new CfnOutput(Stack.of(scope), 'GraphQLAPIEndpointOutput', {
        value: api.graphqlUrl,
        description: 'Your GraphQL API endpoint.',
        exportName: Fn.join(':', [Aws.STACK_NAME, 'GraphQLApiEndpoint']),
      });
    }

    api.addToSchema(output.buildSchema());
    return api;
  }

  private collectResolvers(context: TransformerContext, api: GraphQLAPIProvider): void {
    const resolverEntries = context.resolvers.collectResolvers();

    for (const [resolverName, resolver] of resolverEntries) {
      const userSlots = this.userDefinedSlots[resolverName] || [];

      userSlots.forEach((slot) => {
        const requestTemplate = slot.requestResolver
          ? MappingTemplate.s3MappingTemplateFromString(slot.requestResolver.template, slot.requestResolver.fileName)
          : undefined;
        const responseTemplate = slot.responseResolver
          ? MappingTemplate.s3MappingTemplateFromString(slot.responseResolver.template, slot.responseResolver.fileName)
          : undefined;

        resolver.addVtlFunctionToSlot(slot.slotName, requestTemplate, responseTemplate);
      });

      resolver.synthesize(context, api);
    }
  }

  private transformObject(
    transformer: TransformerPluginProvider,
    def: ObjectTypeDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.object)) {
          const transformKey = makeSeenTransformationKey(dir, def, undefined, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.object(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'object()' method`);
        }
      }
      index++;
    }
    for (const field of def.fields ?? []) {
      this.transformField(transformer, def, field, validDirectiveNameMap, context);
    }
  }

  private transformField(
    transformer: TransformerPluginProvider,
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    def: FieldDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchFieldDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.field)) {
          const transformKey = makeSeenTransformationKey(dir, parent, def, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.field(parent, def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'field()' method`);
        }
      }
      index++;
    }
    for (const arg of def.arguments ?? []) {
      this.transformArgument(transformer, parent, def, arg, validDirectiveNameMap, context);
    }
  }

  private transformArgument(
    transformer: TransformerPluginProvider,
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    field: FieldDefinitionNode,
    arg: InputValueDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of arg.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchArgumentDirective(transformer.directive, dir, arg)) {
        if (isFunction(transformer.argument)) {
          const transformKey = makeSeenTransformationKey(dir, parent, field, arg, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.argument(arg, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'argument()' method`);
        }
      }
      index++;
    }
  }

  private transformInterface(
    transformer: TransformerPluginProvider,
    def: InterfaceTypeDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.interface)) {
          const transformKey = makeSeenTransformationKey(dir, def, undefined, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.interface(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'interface()' method`);
        }
      }
      index++;
    }
    for (const field of def.fields ?? []) {
      this.transformField(transformer, def, field, validDirectiveNameMap, context);
    }
  }

  private transformScalar(
    transformer: TransformerPluginProvider,
    def: ScalarTypeDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.scalar)) {
          const transformKey = makeSeenTransformationKey(dir, def, undefined, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.scalar(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'scalar()' method`);
        }
      }
      index++;
    }
  }

  private transformUnion(
    transformer: TransformerPluginProvider,
    def: UnionTypeDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.union)) {
          const transformKey = makeSeenTransformationKey(dir, def, undefined, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.union(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'union()' method`);
        }
      }
      index++;
    }
  }

  private transformEnum(
    transformer: TransformerPluginProvider,
    def: EnumTypeDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.enum)) {
          const transformKey = makeSeenTransformationKey(dir, def, undefined, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.enum(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'enum()' method`);
        }
      }
      index++;
    }
    for (const value of def.values ?? []) {
      this.transformEnumValue(transformer, def, value, validDirectiveNameMap, context);
    }
  }

  private transformEnumValue(
    transformer: TransformerPluginProvider,
    enm: EnumTypeDefinitionNode,
    def: EnumValueDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchEnumValueDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.enumValue)) {
          const transformKey = makeSeenTransformationKey(dir, enm, def, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.enumValue(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'enumValue()' method`);
        }
      }
      index++;
    }
  }

  private transformInputObject(
    transformer: TransformerPluginProvider,
    def: InputObjectTypeDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.input)) {
          const transformKey = makeSeenTransformationKey(dir, def, undefined, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.input(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'input()' method`);
        }
      }
      index++;
    }
    for (const field of def.fields ?? []) {
      this.transformInputField(transformer, def, field, validDirectiveNameMap, context);
    }
  }

  private transformInputField(
    transformer: TransformerPluginProvider,
    input: InputObjectTypeDefinitionNode,
    def: InputValueDefinitionNode,
    validDirectiveNameMap: { [k: string]: boolean },
    context: TransformerContext,
  ): void {
    let index = 0;
    for (const dir of def.directives ?? []) {
      if (!validDirectiveNameMap[dir.name.value]) {
        throw new UnknownDirectiveError(
          `Unknown directive '${dir.name.value}'. Either remove the directive from the schema or add a transformer to handle it.`,
        );
      }
      if (matchInputFieldDirective(transformer.directive, dir, def)) {
        if (isFunction(transformer.inputValue)) {
          const transformKey = makeSeenTransformationKey(dir, input, def, undefined, index);
          if (!this.seenTransformations[transformKey]) {
            transformer.inputValue(def, dir, context);
            this.seenTransformations[transformKey] = true;
          }
        } else {
          throw new InvalidTransformerError(`The transformer '${transformer.name}' must implement the 'inputValue()' method`);
        }
      }
      index++;
    }
  }

  public getLogs(): TransformerLog[] {
    return this.logs;
  }

  private ensureNoneDataSource(api: GraphQLAPIProvider): void {
    if (!api.host.hasDataSource(NONE_DATA_SOURCE_NAME)) {
      api.host.addNoneDataSource(NONE_DATA_SOURCE_NAME, {
        name: NONE_DATA_SOURCE_NAME,
        description: 'None Data Source for Pipeline functions',
      });
    }
  }
}
