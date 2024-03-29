import { DirectiveWrapper, generateGetArgumentsInput, MappingTemplate, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FunctionDirective } from '@aws-amplify/graphql-directives';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import * as cdk from 'aws-cdk-lib';
import { obj, str, ref, printBlock, compoundExpression, qref, raw, iff, Expression } from 'graphql-mapping-template';
import { FunctionResourceIDs, ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { DirectiveNode, ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode } from 'graphql';

type FunctionDirectiveConfiguration = {
  name: string;
  region: string | undefined;
  accountId: string | undefined;
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
      } as FunctionDirectiveConfiguration,
      generateGetArgumentsInput(acc.transformParameters),
    );
    let resolver = this.resolverGroups.get(definition);

    if (resolver === undefined) {
      resolver = [];
      this.resolverGroups.set(definition, resolver);
    }

    resolver.push(args);
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
                }),
              ),
              `${functionId}.req.vtl`,
            ),
            MappingTemplate.s3MappingTemplateFromString(
              printBlock('Handle error or return result')(
                compoundExpression([
                  iff(ref('ctx.error'), raw('$util.error($ctx.error.message, $ctx.error.type)')),
                  raw('$util.toJson($ctx.result)'),
                ]),
              ),
              `${functionId}.res.vtl`,
            ),
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
