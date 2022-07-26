import { Transformer, gql, TransformerContext } from 'graphql-transformer-core';
import { obj, str, ref, printBlock, compoundExpression, qref, raw, iff } from 'graphql-mapping-template';
import {
  ResolverResourceIDs,
  FunctionResourceIDs,
  ResourceConstants,
  parseFunctionDirective,
  FunctionDirectiveConfig,
} from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode, FieldDefinitionNode, DirectiveNode } from 'graphql';
import { AppSync, IAM, Fn } from 'cloudform-types';
import { lambdaArnResource } from './lambdaArns';

const FUNCTION_DIRECTIVE_STACK = 'FunctionDirectiveStack';

export class FunctionTransformer extends Transformer {
  constructor() {
    // TODO remove once prettier is upgraded
    // prettier-ignore
    super(
      'FunctionTransformer',
      gql`
        directive @function(name: String!, region: String, accountId: String) repeatable on FIELD_DEFINITION
      `
    );
  }

  /**
   * Add the required resources to invoke a lambda function for this field.
   */
  field = (parent: ObjectTypeDefinitionNode, definition: FieldDefinitionNode, directive: DirectiveNode, ctx: TransformerContext) => {
    const fdConfig = parseFunctionDirective(directive);

    // Add the iam role if it does not exist.
    const iamRoleKey = FunctionResourceIDs.FunctionIAMRoleID(fdConfig);
    if (!ctx.getResource(iamRoleKey)) {
      ctx.setResource(iamRoleKey, this.role(fdConfig));
      ctx.mapResourceToStack(FUNCTION_DIRECTIVE_STACK, iamRoleKey);
    }

    // Add the data source if it does not exist.
    const lambdaDataSourceKey = FunctionResourceIDs.FunctionDataSourceID(fdConfig);
    if (!ctx.getResource(lambdaDataSourceKey)) {
      ctx.setResource(lambdaDataSourceKey, this.datasource(fdConfig));
      ctx.mapResourceToStack(FUNCTION_DIRECTIVE_STACK, lambdaDataSourceKey);
    }

    // Add function that invokes the lambda function
    const functionConfigurationKey = FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(fdConfig);
    if (!ctx.getResource(functionConfigurationKey)) {
      ctx.setResource(functionConfigurationKey, this.function(fdConfig));
      ctx.mapResourceToStack(FUNCTION_DIRECTIVE_STACK, functionConfigurationKey);
    }

    // Add resolver that invokes our function
    const typeName = parent.name.value;
    const fieldName = definition.name.value;
    const resolverKey = ResolverResourceIDs.ResolverResourceID(typeName, fieldName);
    const resolver = ctx.getResource(resolverKey);
    if (!resolver) {
      ctx.setResource(resolverKey, this.resolver(typeName, fieldName, fdConfig));
      ctx.mapResourceToStack(FUNCTION_DIRECTIVE_STACK, resolverKey);
    } else if (resolver.Properties.Kind === 'PIPELINE') {
      ctx.setResource(
        resolverKey,
        this.appendFunctionToResolver(resolver, FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(fdConfig))
      );
    }
  };

  /**
   * Create a role that allows our AppSync API to talk to our Lambda function.
   */
  role = (fdConfig: FunctionDirectiveConfig): any => {
    return new IAM.Role({
      RoleName: Fn.If(
        ResourceConstants.CONDITIONS.HasEnvironmentParameter,
        Fn.Join('-', [
          FunctionResourceIDs.FunctionIAMRoleName(fdConfig.name, true), // max of 64. 64-10-26-28 = 0
          Fn.GetAtt(ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'), // 26
          Fn.Ref(ResourceConstants.PARAMETERS.Env), // 10
        ]),
        Fn.Join('-', [
          FunctionResourceIDs.FunctionIAMRoleName(fdConfig.name, false), // max of 64. 64-26-38 = 0
          Fn.GetAtt(ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'), // 26
        ])
      ),
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'appsync.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      Policies: [
        {
          PolicyName: 'InvokeLambdaFunction',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['lambda:InvokeFunction'],
                Resource: lambdaArnResource(fdConfig),
              },
            ],
          },
        },
      ],
    });
  };

  /**
   * Creates a lambda data source that registers the lambda function and associated role.
   */
  datasource = (fdConfig: FunctionDirectiveConfig): any => {
    return new AppSync.DataSource({
      ApiId: Fn.Ref(ResourceConstants.PARAMETERS.AppSyncApiId),
      Name: FunctionResourceIDs.FunctionDataSourceID(fdConfig),
      Type: 'AWS_LAMBDA',
      ServiceRoleArn: Fn.GetAtt(FunctionResourceIDs.FunctionIAMRoleID(fdConfig), 'Arn'),
      LambdaConfig: {
        LambdaFunctionArn: lambdaArnResource(fdConfig),
      },
    }).dependsOn(FunctionResourceIDs.FunctionIAMRoleID(fdConfig));
  };

  /**
   * Create a new pipeline function that calls out to the lambda function and returns the value.
   */
  function = (fdConfig: FunctionDirectiveConfig): any => {
    return new AppSync.FunctionConfiguration({
      ApiId: Fn.Ref(ResourceConstants.PARAMETERS.AppSyncApiId),
      Name: FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(fdConfig),
      DataSourceName: FunctionResourceIDs.FunctionDataSourceID(fdConfig),
      FunctionVersion: '2018-05-29',
      RequestMappingTemplate: printBlock(`Invoke AWS Lambda data source: ${FunctionResourceIDs.FunctionDataSourceID(fdConfig)}`)(
        obj({
          version: str('2018-05-29'),
          operation: str('Invoke'),
          payload: obj({
            typeName: str('$ctx.stash.get("typeName")'),
            fieldName: str('$ctx.stash.get("fieldName")'),
            arguments: ref('util.toJson($ctx.arguments)'),
            identity: ref('util.toJson($ctx.identity)'),
            source: ref('util.toJson($ctx.source)'),
            request: ref('util.toJson($ctx.request)'),
            prev: ref('util.toJson($ctx.prev)'),
          }),
        })
      ),
      ResponseMappingTemplate: printBlock('Handle error or return result')(
        compoundExpression([
          iff(ref('ctx.error'), raw('$util.error($ctx.error.message, $ctx.error.type)')),
          raw('$util.toJson($ctx.result)'),
        ])
      ),
    }).dependsOn(FunctionResourceIDs.FunctionDataSourceID(fdConfig));
  };

  /**
   * Create a resolver of one that calls the "function" function.
   */
  resolver = (type: string, field: string, fdConfig: FunctionDirectiveConfig): any => {
    return new AppSync.Resolver({
      ApiId: Fn.Ref(ResourceConstants.PARAMETERS.AppSyncApiId),
      TypeName: type,
      FieldName: field,
      Kind: 'PIPELINE',
      PipelineConfig: {
        Functions: [Fn.GetAtt(FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(fdConfig), 'FunctionId')],
      },
      RequestMappingTemplate: printBlock('Stash resolver specific context.')(
        compoundExpression([qref(`$ctx.stash.put("typeName", "${type}")`), qref(`$ctx.stash.put("fieldName", "${field}")`), obj({})])
      ),
      ResponseMappingTemplate: '$util.toJson($ctx.prev.result)',
    }).dependsOn(FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(fdConfig));
  };

  appendFunctionToResolver(resolver: any, functionId: string) {
    if (
      resolver.Properties.PipelineConfig &&
      resolver.Properties.PipelineConfig.Functions &&
      Array.isArray(resolver.Properties.PipelineConfig.Functions)
    ) {
      resolver.Properties.PipelineConfig.Functions.push(Fn.GetAtt(functionId, 'FunctionId'));
    }
    return resolver;
  }
}
