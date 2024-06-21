import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  MappingTemplate,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { FunctionDirective } from '@aws-amplify/graphql-directives';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import * as cdk from 'aws-cdk-lib';
import { obj, str, ref, printBlock, compoundExpression, qref, raw, iff, Expression, set, bool } from 'graphql-mapping-template';
import { FunctionResourceIDs, ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import {
  DirectiveNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  FieldDefinitionNode,
  Kind,
  DocumentNode,
  DefinitionNode,
  ArgumentNode,
} from 'graphql';
import { WritableDraft } from 'immer/dist/types/types-external';
import produce from 'immer';

type FunctionDirectiveConfiguration = {
  name: string;
  region: string | undefined;
  accountId: string | undefined;
  invocationType: string;
  resolverTypeName: string;
  resolverFieldName: string;
};

const FUNCTION_DIRECTIVE_STACK = 'FunctionDirectiveStack';

export class FunctionTransformer extends TransformerPluginBase {
  private resolverGroups: Map<FieldDefinitionNode, FunctionDirectiveConfiguration[]> = new Map();

  constructor(private readonly functionNameMap?: Record<string, lambda.IFunction>) {
    super('amplify-function-transformer', FunctionDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    acc: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments(
      {
        resolverTypeName: parent.name.value,
        resolverFieldName: definition.name.value,
        invocationType: FunctionDirective.defaults.invocationType,
      } as FunctionDirectiveConfiguration,
      generateGetArgumentsInput(acc.transformParameters),
    );

    validate(args, definition);
    let resolver = this.resolverGroups.get(definition);

    if (resolver === undefined) {
      resolver = [];
      this.resolverGroups.set(definition, resolver);
    }

    resolver.push(args);
  };

  /**
   * `invocationType: Event` requires the addition of a new type `EventInvocationResponse`
   * to the GraphQL schema. This should only be added here if:
   *   - one or more function directives in a model schema contain the `Event` invocation type.
   *   - the type doesn't already exist in the schema.
   */
  mutateSchema = (ctx: TransformerPreProcessContextProvider): DocumentNode => {
    // a few simple predicates to promote readability.
    const isObjectTypePredicate = (definition: DefinitionNode): boolean => {
      return definition.kind === Kind.OBJECT_TYPE_DEFINITION;
    };

    const isEventInvocationArgumentPredicate = (argumentNode: ArgumentNode | undefined): boolean => {
      return argumentNode?.name.value === 'invocationType' && argumentNode.value.kind === Kind.ENUM && argumentNode.value.value === 'Event';
    };

    const objectTypeDefinitionNodes = ctx.inputDocument.definitions.filter((definition) =>
      isObjectTypePredicate(definition),
    ) as ObjectTypeDefinitionNode[];

    // we care only about the directive defined on the fields of ObjectTypeDefinition nodes.
    // so we're flattening two layers down to get them.
    const functionDirectiveArguments = objectTypeDefinitionNodes
      .flatMap((typeDef) => typeDef.fields)
      .flatMap((field) => field?.directives)
      .filter((directive) => directive?.name.value === FunctionDirective.name)
      .flatMap((functionDirective) => functionDirective?.arguments);

    const schemaContainsDirectiveWithEventInvocationType = functionDirectiveArguments.some(isEventInvocationArgumentPredicate);

    const document: DocumentNode = produce(ctx.inputDocument, (draft: WritableDraft<DocumentNode>) => {
      const documentContainsEventInvocationResponseType = draft.definitions.some(
        (definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name.value === 'EventInvocationResponse',
      );
      if (schemaContainsDirectiveWithEventInvocationType && !documentContainsEventInvocationResponseType) {
        const eventResponseType = eventInvocationResponse();
        draft.definitions.push(eventResponseType as WritableDraft<ObjectTypeDefinitionNode>);
      }
    });

    return document;
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    if (this.resolverGroups.size === 0) {
      return;
    }

    const stack: cdk.Stack = context.stackManager.createStack(FUNCTION_DIRECTIVE_STACK);
    const createdResources = new Map<string, any>();
    const env = context.synthParameters.amplifyEnvironmentName;

    stack.templateOptions.templateFormatVersion = '2010-09-09';
    stack.templateOptions.description = 'An auto-generated nested stack for the @function directive.';

    new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(env, ResourceConstants.NONE)),
    });

    this.resolverGroups.forEach((resolverFns) => {
      resolverFns.forEach((config) => {
        // Create data sources that register Lambdas and IAM roles.
        const dataSourceId = FunctionResourceIDs.FunctionDataSourceID(config.name, config.region, config.accountId);

        if (!createdResources.has(dataSourceId)) {
          const referencedFunction: lambda.IFunction =
            this.functionNameMap && config.name in this.functionNameMap
              ? this.functionNameMap[config.name]
              : lambda.Function.fromFunctionAttributes(stack, `${dataSourceId}Function`, {
                  functionArn: lambdaArnResource(env, config.name, config.region, config.accountId),
                });
          const dataSourceScope = context.stackManager.getScopeFor(dataSourceId, FUNCTION_DIRECTIVE_STACK);
          const dataSource = context.api.host.addLambdaDataSource(dataSourceId, referencedFunction, {}, dataSourceScope);
          createdResources.set(dataSourceId, dataSource);
        }

        // Create AppSync functions.
        const functionId = FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(config.name, config.region, config.accountId);
        let func = createdResources.get(functionId);

        if (func === undefined) {
          const funcScope = context.stackManager.getScopeFor(functionId, FUNCTION_DIRECTIVE_STACK);
          func = context.api.host.addAppSyncFunction(
            functionId,
            MappingTemplate.s3MappingTemplateFromString(
              printBlock(`Invoke AWS Lambda data source: ${dataSourceId}`)(
                obj({
                  version: str('2018-05-29'),
                  operation: str('Invoke'),
                  payload: obj({
                    typeName: ref('util.toJson($ctx.stash.get("typeName"))'),
                    fieldName: ref('util.toJson($ctx.stash.get("fieldName"))'),
                    arguments: ref('util.toJson($ctx.arguments)'),
                    identity: ref('util.toJson($ctx.identity)'),
                    source: ref('util.toJson($ctx.source)'),
                    request: ref('util.toJson($ctx.request)'),
                    prev: ref('util.toJson($ctx.prev)'),
                  }),
                  invocationType: str(config.invocationType),
                }),
              ),
              `${functionId}.req.vtl`,
            ),
            MappingTemplate.s3MappingTemplateFromString(responseMappingTemplate(config), `${functionId}.res.vtl`),
            dataSourceId,
            funcScope,
          );

          createdResources.set(functionId, func);
        }

        // Create the GraphQL resolvers.
        const resolverId = ResolverResourceIDs.ResolverResourceID(config.resolverTypeName, config.resolverFieldName);
        let resolver = createdResources.get(resolverId);

        const requestTemplate: Array<Expression> = [
          qref(`$ctx.stash.put("typeName", "${config.resolverTypeName}")`),
          qref(`$ctx.stash.put("fieldName", "${config.resolverFieldName}")`),
        ];
        const authModes = [context.authConfig.defaultAuthentication, ...(context.authConfig.additionalAuthenticationProviders || [])].map(
          (mode) => mode?.authenticationType,
        );
        if (authModes.includes(AuthorizationType.IAM)) {
          const authRole = context.synthParameters.authenticatedUserRoleName;
          const unauthRole = context.synthParameters.unauthenticatedUserRoleName;
          const account = cdk.Stack.of(context.stackManager.scope).account;
          requestTemplate.push(
            qref(`$ctx.stash.put("authRole", "arn:aws:sts::${account}:assumed-role/${authRole}/CognitoIdentityCredentials")`),
            qref(`$ctx.stash.put("unauthRole", "arn:aws:sts::${account}:assumed-role/${unauthRole}/CognitoIdentityCredentials")`),
          );

          const identityPoolId = context.synthParameters.identityPoolId;
          if (identityPoolId) {
            requestTemplate.push(qref(`$ctx.stash.put("identityPoolId", "${identityPoolId}")`));
          }
          const adminRoles = context.synthParameters.adminRoles ?? [];
          requestTemplate.push(qref(`$ctx.stash.put("adminRoles", ${JSON.stringify(adminRoles)})`));
        }
        requestTemplate.push(obj({}));

        if (resolver === undefined) {
          // TODO: update function to use resolver manager.
          const resolverScope = context.stackManager.getScopeFor(resolverId, FUNCTION_DIRECTIVE_STACK);
          resolver = context.api.host.addResolver(
            config.resolverTypeName,
            config.resolverFieldName,
            MappingTemplate.inlineTemplateFromString(printBlock('Stash resolver specific context.')(compoundExpression(requestTemplate))),
            MappingTemplate.s3MappingTemplateFromString(
              '$util.toJson($ctx.prev.result)',
              `${config.resolverTypeName}.${config.resolverFieldName}.res.vtl`,
            ),
            resolverId,
            undefined,
            [],
            resolverScope,
          );
          createdResources.set(resolverId, resolver);
        }

        resolver.pipelineConfig.functions.push(func.functionId);
      });
    });
  };
}

const responseMappingTemplate = (config: FunctionDirectiveConfiguration): string => {
  if (config.invocationType === 'Event') {
    /*
      #set( $success = true )
      #if( $ctx.error )
        $util.error($ctx.error.message, $ctx.error.type)
        #set( $success = false )
      #end
      #set( $response = {
        "success": $success
      } )
      $util.toJson($response)
    */
    return printBlock('Handle error or return result')(
      compoundExpression([
        set(ref('success'), bool(true)),
        iff(
          ref('ctx.error'),
          compoundExpression([raw('$util.error($ctx.error.message, $ctx.error.type)'), set(ref('success'), bool(false))]),
        ),
        compoundExpression([set(ref('response'), obj({ success: ref('success') })), raw('$util.toJson($response)')]),
      ]),
    );
  }

  /*
    #if( $ctx.error )
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    $util.toJson($ctx.result)
  */
  return printBlock('Handle error or return result')(
    compoundExpression([
      iff(ref('ctx.error'), compoundExpression([raw('$util.error($ctx.error.message, $ctx.error.type)')])),
      raw('$util.toJson($ctx.result)'),
    ]),
  );
};

const validate = (config: FunctionDirectiveConfiguration, definition: FieldDefinitionNode): void => {
  // TODO: event invocation type on valid for mutation ... and maybe (??) query types

  // only EventInvocationResponse return types are valid for Event invocation types
  // TODO: clean this up
  // - use applicable graphql-common utils
  // - account for non-null and list return types
  // - include field name / return type in error message
  const { type } = definition;
  if (config.invocationType === 'Event') {
    if (type.kind === 'NamedType') {
      if (type.name.value !== 'EventInvocationResponse') {
        throw new InvalidDirectiveError(`
        Invalid return type for 'invocationType: Event'. Return type must be 'EventInvocationResponse'.
        `);
      }
    }
  }
};

const lambdaArnResource = (env: string, name: string, region?: string, accountId?: string): string => {
  const substitutions: { [key: string]: string } = {};
  // eslint-disable-next-line no-template-curly-in-string
  if (name.includes('${env}')) {
    substitutions.env = env;
  }
  return cdk.Fn.conditionIf(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    cdk.Fn.sub(lambdaArnKey(name, region, accountId), substitutions),
    cdk.Fn.sub(lambdaArnKey(name.replace(/(-\${env})/, ''), region, accountId)),
  ).toString();
};

const lambdaArnKey = (name: string, region?: string, accountId?: string): string => {
  // eslint-disable-next-line no-template-curly-in-string
  return `arn:aws:lambda:${region ? region : '${AWS::Region}'}:${accountId ? accountId : '${AWS::AccountId}'}:function:${name}`;
};

/**
 * `EventInvocationResponse` type to be added to schema **IF** the schema contains >= 1
 *  function directives with the `invocationMode: Event` specified.
 * @returns an {@link ObjectTypeDefinitionNode} representing `EventInvocationResponse` type.
 */
const eventInvocationResponse = (): ObjectTypeDefinitionNode => {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: {
      kind: Kind.NAME,
      value: 'EventInvocationResponse',
    },
    description: {
      kind: Kind.STRING,
      value: 'Return type for lambda function event invocation.',
    },
    fields: [
      {
        kind: Kind.FIELD_DEFINITION,
        description: {
          kind: Kind.STRING,
          value: 'Whether the asynchronous lambda function invocation was successful. If false, you should expect errors in the response.',
        },
        name: {
          kind: Kind.NAME,
          value: 'success',
        },
        type: {
          kind: Kind.NON_NULL_TYPE,
          type: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'Boolean',
            },
          },
        },
      },
    ],
  };
};
