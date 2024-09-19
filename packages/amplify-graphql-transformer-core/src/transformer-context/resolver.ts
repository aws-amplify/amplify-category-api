/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import {
  AppSyncFunctionConfigurationProvider,
  DataSourceProvider,
  FunctionRuntimeTemplate,
  GraphQLAPIProvider,
  JSRuntimeTemplate,
  MappingTemplateProvider,
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerResolversManagerProvider,
  VTLRuntimeTemplate,
} from '@aws-amplify/graphql-transformer-interfaces';
import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { isResolvableObject, Lazy, Stack } from 'aws-cdk-lib';
import { toPascalCase } from 'graphql-transformer-common';
import { dedent } from 'ts-dedent';
import { Construct } from 'constructs';
import { MappingTemplate, S3MappingTemplate } from '../cdk-compat';
import { InvalidDirectiveError } from '../errors';
// eslint-disable-next-line import/no-cycle
import * as SyncUtils from '../transformation/sync-utils';
import { isJsResolverFnRuntime } from '../utils/function-runtime';

type Slot = {
  mappingTemplate?: FunctionRuntimeTemplate;
  dataSource?: DataSourceProvider;
  runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty;
};

// Name of the None Data source used for pipeline resolver
export const NONE_DATA_SOURCE_NAME = 'NONE_DS';

/**
 * ResolverManager
 */
export class ResolverManager implements TransformerResolversManagerProvider {
  private resolvers: Map<string, TransformerResolverProvider> = new Map();

  generateQueryResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver =>
    new TransformerResolver(
      typeName,
      fieldName,
      resolverLogicalId,
      { requestMappingTemplate, responseMappingTemplate },
      ['init', 'preAuth', 'auth', 'postAuth', 'preDataLoad'],
      ['postDataLoad', 'finish'],
      dataSource,
    );

  generateMutationResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver =>
    new TransformerResolver(
      typeName,
      fieldName,
      resolverLogicalId,
      { requestMappingTemplate, responseMappingTemplate },
      ['init', 'preAuth', 'auth', 'postAuth', 'preUpdate'],
      ['postUpdate', 'finish'],
      dataSource,
    );

  generateSubscriptionResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver =>
    new TransformerResolver(
      typeName,
      fieldName,
      resolverLogicalId,
      { requestMappingTemplate, responseMappingTemplate },
      ['init', 'preAuth', 'auth', 'postAuth', 'preSubscribe'],
      [],
    );

  addResolver = (typeName: string, fieldName: string, resolver: TransformerResolverProvider): TransformerResolverProvider => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      throw new Error(`A resolver for typeName ${typeName} fieldName: ${fieldName} already exists`);
    }
    this.resolvers.set(key, resolver);
    return resolver;
  };

  // eslint-disable-next-line consistent-return
  getResolver = (typeName: string, fieldName: string): TransformerResolverProvider | undefined => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      return this.resolvers.get(key) as TransformerResolverProvider;
    }
  };

  hasResolver = (typeName: string, fieldName: string): boolean => {
    const key = `${typeName}.${fieldName}`;
    return this.resolvers.has(key);
  };

  removeResolver = (typeName: string, fieldName: string): TransformerResolverProvider => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      const resolver = this.resolvers.get(key) as TransformerResolverProvider;
      this.resolvers.delete(key);
      return resolver;
    }
    throw new Error(`Resolver for typeName ${typeName} fieldName: ${fieldName} does not exists`);
  };

  collectResolvers = (): Map<string, TransformerResolverProvider> => new Map(this.resolvers.entries());
}
/**
 * TransformerResolver
 */
export class TransformerResolver implements TransformerResolverProvider {
  private readonly slotMap: Map<string, Slot[]> = new Map();

  private readonly slotNames: Set<string>;

  private scope?: Construct;

  constructor(
    private typeName: string,
    private fieldName: string,
    private resolverLogicalId: string,
    private mappingTemplate: FunctionRuntimeTemplate,
    private requestSlots: string[],
    private responseSlots: string[],
    private datasource?: DataSourceProvider,
    private runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ) {
    if (!typeName) {
      throw new InvalidDirectiveError('typeName is required');
    }
    if (!fieldName) {
      throw new InvalidDirectiveError('fieldName is required');
    }
    if (!resolverLogicalId) {
      throw new InvalidDirectiveError('resolverLogicalId is required');
    }
    if (!isJsResolverFnRuntime(runtime) && !('requestMappingTemplate' in mappingTemplate)) {
      throw new InvalidDirectiveError('requestMappingTemplate is required');
    }
    if (!isJsResolverFnRuntime(runtime) && !('responseMappingTemplate' in mappingTemplate)) {
      throw new InvalidDirectiveError('responseMappingTemplate is required');
    }
    if (isJsResolverFnRuntime(runtime) && !('codeMappingTemplate' in mappingTemplate)) {
      throw new InvalidDirectiveError('codeMappingTemplate is required for JavaScript resolver function runtimes');
    }
    this.slotNames = new Set([...requestSlots, ...responseSlots]);
  }

  /**
   * Map a resolver to a given stack.
   * @deprecated, use setScope instead.
   * @param stack the stack you are mapping to
   */
  mapToStack = (stack: Stack): void => {
    this.scope = stack;
  };

  setScope = (scope: Construct): void => {
    this.scope = scope;
  };

  addJsFunctionToSlot = (slotName: string, codeMappingTemplate: MappingTemplateProvider, dataSource?: DataSourceProvider): void => {
    this._addToSlot(slotName, { codeMappingTemplate }, dataSource);
  };

  addToSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
    dataSource?: DataSourceProvider,
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ): void => {
    this._addToSlot(slotName, { requestMappingTemplate, responseMappingTemplate }, dataSource, runtime);
  };

  private _addToSlot = (
    slotName: string,
    mappingTemplate: FunctionRuntimeTemplate,
    dataSource?: DataSourceProvider,
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ): void => {
    if (!this.slotNames.has(slotName)) {
      throw new Error(`Resolver is missing slot ${slotName}`);
    }
    let slotEntry: Slot[];
    if (this.slotMap.has(slotName)) {
      slotEntry = this.slotMap.get(slotName)!;
    } else {
      slotEntry = [];
    }

    if (this.slotExists(slotName, mappingTemplate)) {
      this.updateSlot(slotName, mappingTemplate);
    } else {
      slotEntry.push({
        mappingTemplate,
        dataSource,
        runtime,
      });
    }
    this.slotMap.set(slotName, slotEntry);
  };

  slotExists = (slotName: string, mappingTemplate?: FunctionRuntimeTemplate): boolean =>
    this.findSlot(slotName, mappingTemplate) !== undefined;

  findSlot = (slotName: string, mappingTemplate?: FunctionRuntimeTemplate): Slot | undefined => {
    const slotEntries = this.slotMap.get(slotName);
    const mappingTemplateNames = this.getMappingTemplateNames(mappingTemplate);
    if (!slotEntries || mappingTemplateNames.find((name) => name.includes('{slotIndex}'))) {
      return;
    }

    let slotIndex = 1;
    for (const slotEntry of slotEntries) {
      const slotEntryMappingTemplateNames = this.getMappingTemplateNames(slotEntry.mappingTemplate, 'NOT-FOUND').map((name) =>
        name.replace('{slotName}', slotName).replace('{slotIndex}', `${slotIndex}`),
      );

      // If both request and response mapping templates are inline, skip check
      if (slotEntryMappingTemplateNames.every((name) => name === '')) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // If name matches, then it is an overridden resolver
      if (
        slotEntryMappingTemplateNames.length === mappingTemplateNames.length &&
        slotEntryMappingTemplateNames.every((element, index) => element === mappingTemplateNames[index])
      ) {
        // eslint-disable-next-line consistent-return
        return slotEntry;
      }
      slotIndex++;
    }
  };

  updateSlot = (slotName: string, mappingTemplate?: FunctionRuntimeTemplate): void => {
    const slot = this.findSlot(slotName, mappingTemplate);
    if (slot) {
      // If the mapping template is a JS runtime template, we don't really care whether the slot is currently occupied by a
      // VTL or JS runtime template. We just replace it with the JS runtime template.
      if (this.isJsRuntimeTemplate(mappingTemplate)) {
        slot.mappingTemplate = mappingTemplate;
        slot.runtime = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' };
      } else if (mappingTemplate) {
        // VTL runtime template updates require some extra care because we allow a request or response mappingTemplate to be passed individually.

        //  can have a requestMappingTemplate
        // If the mapping template is a VTL runtime template, we need to do some checks to make sure we can update the slot.
        const { requestMappingTemplate, responseMappingTemplate } = mappingTemplate;
        // If both request and response mapping templates are provided, we can update the slot.
        if (requestMappingTemplate && responseMappingTemplate) {
          slot.mappingTemplate = mappingTemplate;
        }

        // If the slot is currently a JS runtime template, we can also assign the VTL template regardless of whether both request and
        // response mapping template are provided because defaults will be added further downstream.
        if (this.isJsRuntimeTemplate(slot.mappingTemplate)) {
          slot.mappingTemplate = mappingTemplate;
          slot.runtime = undefined;
        } else if (slot.mappingTemplate) {
          const { requestMappingTemplate: slotRequestMappingTemplate, responseMappingTemplate: slotResponseMappingTemplate } =
            slot.mappingTemplate as VTLRuntimeTemplate;
          // The slot is currently a occupied by a VTL runtime template, we need to be sure not to discard existing request or
          // response mapping templates when that mapping template isn't provided.
          slot.mappingTemplate.requestMappingTemplate = (requestMappingTemplate as any).name
            ? requestMappingTemplate
            : slotRequestMappingTemplate;
          slot.mappingTemplate.responseMappingTemplate = (responseMappingTemplate as any).name
            ? responseMappingTemplate
            : slotResponseMappingTemplate;
        } else {
          // The slot is currently unoccupied, so we can assign the provided mapping template.
          slot.mappingTemplate = mappingTemplate;
        }
      }
    }
  };

  synthesize = (context: TransformerContextProvider, api: GraphQLAPIProvider): void => {
    const scope = this.scope || context.stackManager.scope;
    this.ensureNoneDataSource(api);
    const requestFns = this.synthesizeResolvers(scope, api, this.requestSlots);
    const responseFns = this.synthesizeResolvers(scope, api, this.responseSlots);
    // substitute template name values
    if (isJsResolverFnRuntime(this.runtime)) {
      const { codeMappingTemplate } = this.mappingTemplate as JSRuntimeTemplate;
      this.substituteSlotInfo(codeMappingTemplate, 'main', 0);
    } else {
      const { requestMappingTemplate, responseMappingTemplate } = this.mappingTemplate as VTLRuntimeTemplate;
      requestMappingTemplate && this.substituteSlotInfo(requestMappingTemplate, 'main', 0);
      responseMappingTemplate && this.substituteSlotInfo(responseMappingTemplate, 'main', 0);
    }

    const dataSourceProviderFn = api.host.addAppSyncFunction(
      toPascalCase([this.typeName, this.fieldName, 'DataResolverFn']),
      this.mappingTemplate,
      this.datasource?.name || NONE_DATA_SOURCE_NAME,
      scope,
      this.runtime,
    );

    const { stashString, stashExpression } = this.createStashStatementGenerator(this.runtime);

    let dataSourceType = 'NONE';
    let dataSource = '';
    if (this.datasource) {
      dataSourceType = this.datasource.ds.type;
      switch (dataSourceType) {
        case 'AMAZON_DYNAMODB':
          if (this.datasource.ds.dynamoDbConfig && !isResolvableObject(this.datasource.ds.dynamoDbConfig)) {
            const tableName = this.datasource.ds.dynamoDbConfig?.tableName;
            dataSource = stashString({ name: 'tableName', value: tableName });
            if (
              this.datasource.ds.dynamoDbConfig?.deltaSyncConfig &&
              !isResolvableObject(this.datasource.ds.dynamoDbConfig?.deltaSyncConfig)
            ) {
              const deltaSyncTableTtl = Lazy.string({
                produce: (): string => {
                  if (
                    this.datasource &&
                    this.datasource.ds.dynamoDbConfig &&
                    !isResolvableObject(this.datasource.ds.dynamoDbConfig) &&
                    this.datasource.ds.dynamoDbConfig.deltaSyncConfig &&
                    !isResolvableObject(this.datasource.ds.dynamoDbConfig.deltaSyncConfig) &&
                    this.datasource.ds.dynamoDbConfig.deltaSyncConfig.deltaSyncTableTtl
                  ) {
                    return this.datasource.ds.dynamoDbConfig.deltaSyncConfig.deltaSyncTableTtl;
                  }
                  return SyncUtils.syncDataSourceConfig().DeltaSyncTableTTL.toString();
                },
              });
              dataSource += '\n' + stashString({ name: 'deltaSyncTableTtl', value: deltaSyncTableTtl });
            }
          }

          if (context.isProjectUsingDataStore()) {
            // Remove the suffix "Table" from the datasource name
            // The stack name cannot be retrieved as during the runtime it is tokenized and value not being revealed
            const modelName = this.datasource.name.slice(0, -5);
            const syncConfig = SyncUtils.getSyncConfig(context, modelName)!;
            const funcConf = dataSourceProviderFn.node.children.find(
              (it: any) => it.cfnResourceType === 'AWS::AppSync::FunctionConfiguration',
            ) as CfnFunctionConfiguration;

            if (funcConf) {
              funcConf.syncConfig = {
                conflictDetection: syncConfig.ConflictDetection,
                conflictHandler: syncConfig.ConflictHandler,
                ...(SyncUtils.isLambdaSyncConfig(syncConfig)
                  ? {
                      lambdaConflictHandlerConfig: {
                        lambdaConflictHandlerArn: syncConfig.LambdaConflictHandler.lambdaArn,
                      },
                    }
                  : {}),
              };
            }
          }

          break;
        case 'AMAZON_ELASTICSEARCH':
          if (this.datasource.ds.elasticsearchConfig && !isResolvableObject(this.datasource.ds.elasticsearchConfig)) {
            const endpoint = this.datasource.ds.elasticsearchConfig?.endpoint;
            dataSource = stashString({ name: 'endpoint', value: endpoint });
          }
          break;
        case 'AWS_LAMBDA':
          if (this.datasource.ds.lambdaConfig && !isResolvableObject(this.datasource.ds.lambdaConfig)) {
            const lambdaFunctionArn = this.datasource.ds.lambdaConfig?.lambdaFunctionArn;
            dataSource = stashString({ name: 'lambdaFunctionArn', value: lambdaFunctionArn });
          }
          break;
        case 'HTTP':
          if (this.datasource.ds.httpConfig && !isResolvableObject(this.datasource.ds.httpConfig)) {
            const endpoint = this.datasource.ds.httpConfig?.endpoint;
            dataSource = stashString({ name: 'endpoint', value: endpoint });
          }
          break;
        case 'RELATIONAL_DATABASE':
          if (
            this.datasource.ds.relationalDatabaseConfig &&
            !isResolvableObject(this.datasource.ds.relationalDatabaseConfig) &&
            !isResolvableObject(this.datasource.ds.relationalDatabaseConfig?.rdsHttpEndpointConfig)
          ) {
            const databaseName = this.datasource.ds.relationalDatabaseConfig?.rdsHttpEndpointConfig!.databaseName;
            dataSource = stashString({ name: 'databaseName', value: databaseName });
          }
          break;
        default:
          throw new Error('Unknown DataSource type');
      }
    }
    let initResolver = dedent`
      ${stashString({ name: 'typeName', value: this.typeName })}
      ${stashString({ name: 'fieldName', value: this.fieldName })}
      ${stashExpression({ name: 'conditions', value: '[]' })}
      ${stashExpression({ name: 'metadata', value: '{}' })}
      ${stashString({ name: 'dataSourceType', value: dataSourceType, object: 'metadata' })}
      ${stashString({ name: 'apiId', value: api.apiId, object: 'metadata' })}
      ${stashExpression({ name: 'connectionAttributes', value: '{}' })}
      ${dataSource}
    `;
    const account = Stack.of(context.stackManager.scope).account;
    const authRole = context.synthParameters.authenticatedUserRoleName;
    if (authRole) {
      const authRoleArn = `arn:aws:sts::${account}:assumed-role/${authRole}/CognitoIdentityCredentials`;
      const authRoleStatement = stashString({ name: 'authRole', value: authRoleArn });

      initResolver += dedent`\n
        ${authRoleStatement}
      `;
    }
    const unauthRole = context.synthParameters.unauthenticatedUserRoleName;
    if (unauthRole) {
      const unauthRoleArn = `arn:aws:sts::${account}:assumed-role/${unauthRole}/CognitoIdentityCredentials`;
      const unauthRoleStatement = stashString({ name: 'unauthRole', value: unauthRoleArn });
      initResolver += dedent`\n
        ${unauthRoleStatement}
      `;
    }
    const identityPoolId = context.synthParameters.identityPoolId;
    if (identityPoolId) {
      const identityPoolStatement = stashString({ name: 'identityPoolId', value: identityPoolId });
      initResolver += dedent`\n
        ${identityPoolStatement}
      `;
    }
    const adminRoles = context.synthParameters.adminRoles ?? [];
    const adminRolesStatement = stashExpression({ name: 'adminRoles', value: JSON.stringify(adminRoles) });
    initResolver += dedent`\n
      ${adminRolesStatement}
    `;

    if (isJsResolverFnRuntime(this.runtime)) {
      initResolver = dedent`
        export const request = (ctx) => {
          ${initResolver}
          return {};
        }
      `;
    } else {
      initResolver += '\n$util.toJson({})';
    }

    const initResponseResolver = isJsResolverFnRuntime(this.runtime)
      ? dedent`
        export const response = (ctx) => {
          return ctx.prev.result;
        };
      `
      : '$util.toJson($ctx.prev.result)';

    const initResolverMappingTemplate: FunctionRuntimeTemplate = isJsResolverFnRuntime(this.runtime)
      ? {
          codeMappingTemplate: MappingTemplate.inlineTemplateFromString(initResolver + '\n\n' + initResponseResolver),
        }
      : {
          requestMappingTemplate: MappingTemplate.inlineTemplateFromString(initResolver),
          responseMappingTemplate: MappingTemplate.inlineTemplateFromString(initResponseResolver),
        };

    api.host.addResolver(
      this.typeName,
      this.fieldName,
      initResolverMappingTemplate,
      this.resolverLogicalId,
      undefined,
      [...requestFns, dataSourceProviderFn, ...responseFns].map((fn) => fn.functionId),
      scope,
      this.runtime,
    );
  };

  synthesizeResolvers = (scope: Construct, api: GraphQLAPIProvider, slotsNames: string[]): AppSyncFunctionConfigurationProvider[] => {
    const appSyncFunctions: AppSyncFunctionConfigurationProvider[] = [];

    for (const slotName of slotsNames) {
      if (this.slotMap.has(slotName)) {
        const slotEntries = this.slotMap.get(slotName);
        // Create individual functions
        let index = 0;
        for (const slotItem of slotEntries!) {
          const name = `${this.typeName}${this.fieldName}${slotName}${index++}Function`;
          const { mappingTemplate, dataSource } = slotItem;
          const { requestMappingTemplate, responseMappingTemplate } = mappingTemplate as VTLRuntimeTemplate;
          const { codeMappingTemplate } = mappingTemplate as JSRuntimeTemplate;

          // eslint-disable-next-line no-unused-expressions
          requestMappingTemplate && this.substituteSlotInfo(requestMappingTemplate, slotName, index);
          // eslint-disable-next-line no-unused-expressions
          responseMappingTemplate && this.substituteSlotInfo(responseMappingTemplate, slotName, index);
          // eslint-disable-next-line no-unused-expressions
          codeMappingTemplate && this.substituteSlotInfo(codeMappingTemplate, slotName, index);

          const defaultVtlTemplate = MappingTemplate.inlineTemplateFromString('$util.toJson({})');
          const defaultJsTemplate = MappingTemplate.inlineTemplateFromString('return {};');

          const template = isJsResolverFnRuntime(slotItem.runtime)
            ? { codeMappingTemplate: codeMappingTemplate || defaultJsTemplate }
            : {
                requestMappingTemplate: requestMappingTemplate || defaultVtlTemplate,
                responseMappingTemplate: responseMappingTemplate || defaultVtlTemplate,
              };

          const fn = api.host.addAppSyncFunction(name, template, dataSource?.name || NONE_DATA_SOURCE_NAME, scope, slotItem.runtime);
          appSyncFunctions.push(fn);
        }
      }
    }
    return appSyncFunctions;
  };

  /**
   * substituteSlotInfo
   */
  private substituteSlotInfo(template: MappingTemplateProvider, slotName: string, index: number): void {
    // Check the constructor name instead of using 'instanceof' because the latter does not work
    // with copies of the class, which happens with custom transformers.
    // See: https://github.com/aws-amplify/amplify-cli/issues/9362
    if (template.constructor.name === S3MappingTemplate.name) {
      (template as S3MappingTemplate).substituteValues({
        slotName,
        slotIndex: index,
        typeName: this.typeName,
        fieldName: this.fieldName,
      });
    }
  }

  /**
   * ensureNoneDataSource
   */
  private ensureNoneDataSource(api: GraphQLAPIProvider): void {
    if (!api.host.hasDataSource(NONE_DATA_SOURCE_NAME)) {
      api.host.addNoneDataSource(NONE_DATA_SOURCE_NAME, {
        name: NONE_DATA_SOURCE_NAME,
        description: 'None Data Source for Pipeline functions',
      });
    }
  }

  /**
   * Generates a function to create stash statements based on the runtime.
   *
   * @param {CfnFunctionConfiguration.AppSyncRuntimeProperty} runtime - The AppSync runtime configuration.
   * @returns {StashStatementGenerator} An object with methods to generate stash statements.
   */
  private createStashStatementGenerator(runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty): StashStatementGenerator {
    const jsStash = (props: StashStatementGeneratorProps): string => {
      const { name, value, object } = props;
      const objectPrefix = object ? `.${object}` : '';
      return `ctx.stash${objectPrefix}.${name} = ${value};`;
    };

    const generateJsStashStatement: StashStatementGenerator = {
      stashExpression: (props: StashStatementGeneratorProps): string => jsStash(props),
      stashString: (props: StashStatementGeneratorProps) => jsStash({ ...props, value: `"${props.value}"` }),
    };

    const vtlStash = (props: StashStatementGeneratorProps): string => {
      const { name, value, object } = props;
      const objectPrefix = object ? `.${object}` : '';
      return `$util.qr($ctx.stash${objectPrefix}.put("${name}", ${value}))`;
    };

    const generateVtlStashStatement: StashStatementGenerator = {
      stashExpression: (props: StashStatementGeneratorProps): string => vtlStash(props),
      stashString: (props: StashStatementGeneratorProps) => vtlStash({ ...props, value: `"${props.value}"` }),
    };

    return isJsResolverFnRuntime(runtime) ? generateJsStashStatement : generateVtlStashStatement;
  }

  private getMappingTemplateNames(mappingTemplate?: FunctionRuntimeTemplate, fallbackName: string = ''): string[] {
    if (this.isJsRuntimeTemplate(mappingTemplate)) {
      return [(mappingTemplate.codeMappingTemplate as any).name ?? fallbackName];
    } else {
      const requestMappingTemplateName = (mappingTemplate?.requestMappingTemplate as any)?.name ?? fallbackName;
      const responseMappingTemplateName = (mappingTemplate?.responseMappingTemplate as any)?.name ?? fallbackName;
      return [requestMappingTemplateName, responseMappingTemplateName];
    }
  }

  private isJsRuntimeTemplate(mappingTemplate?: FunctionRuntimeTemplate): mappingTemplate is JSRuntimeTemplate {
    return (mappingTemplate as JSRuntimeTemplate).codeMappingTemplate !== undefined;
  }
}

/**
 * Properties for generating stash statements.
 */
type StashStatementGeneratorProps = {
  /** The name of the stash variable */
  name: string;
  /** The value to be stashed */
  value?: string;
  /** Optional object name for nested stash */
  object?: string;
};

type StashStatementGeneratorFunction = (props: StashStatementGeneratorProps) => string;

/**
 *  Stash statement generator methods.
 */
type StashStatementGenerator = {
  /**
   * Generates a stash statement for string values.
   * This method ensures that the value is properly quoted as a string.
   *
   * @param {StashStatementGeneratorProps} props - The properties for generating stash statements.
   * @returns {string} The generated stash statement for string values.
   */
  stashString: StashStatementGeneratorFunction;

  /**
   * Generates a stash statement for expression values.
   * This method allows for stashing of non-string values or complex expressions.
   *
   * @param {StashStatementGeneratorProps} props - The properties for generating stash statements.
   * @returns {string} The generated stash statement for expression values.
   */
  stashExpression: StashStatementGeneratorFunction;
};
