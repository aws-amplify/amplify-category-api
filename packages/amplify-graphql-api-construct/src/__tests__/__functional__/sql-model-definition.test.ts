import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { MOCK_SCHEMA, makeSqlDataSourceStrategy } from '../mock-definitions';

describe('sql-bound API generated resource access', () => {
  describe('l1 resources', () => {
    describe('singleton appsync resources', () => {
      it('provides the generated SQL Lambda function as an L1 construct with a VPC configuration', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
          definition: AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.todo.auth.owner.sql, makeSqlDataSourceStrategy('MySQLDefinition')),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        const {
          resources: {
            cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
            functions,
          },
        } = api;

        expect(cfnGraphqlApi).toBeDefined();
        expect(cfnGraphqlSchema).toBeDefined();
        expect(cfnApiKey).not.toBeDefined();
        expect(cfnDataSources).toBeDefined();

        const lambdaDataSource = Object.values(cfnDataSources).find((dataSource) => dataSource.type === 'AWS_LAMBDA');
        expect(lambdaDataSource).toBeDefined();
        expect(lambdaDataSource?.lambdaConfig).toBeDefined();

        expect(functions).toBeDefined();
        const sqlLambda = functions['RDSLambdaLogicalID'];
        expect(sqlLambda).toBeDefined();

        // TODO: Why does IFunction.isBoundToVpc return false even though VPC is configured?
        const cfnFn = sqlLambda.node.defaultChild as CfnFunction;
        const cfnFnVpcConfig = cfnFn.vpcConfig as CfnFunction.VpcConfigProperty | undefined;
        expect(cfnFnVpcConfig).toBeDefined();
        expect(cfnFnVpcConfig?.securityGroupIds?.length).toEqual(1);
        expect(cfnFnVpcConfig?.securityGroupIds?.[0]).toEqual('sg-123abc');
        expect(cfnFnVpcConfig?.subnetIds?.length).toEqual(1);
        expect(cfnFnVpcConfig?.subnetIds?.[0]).toEqual('subnet-123abc');

        // CDK does not expose a public property to view the environment variables. The `environment` property on the lambda.Function
        // implementation is private.
      });

      it('provides the generated VPC Endpoints and security group inbound rules as L1 constructs when provided a VPC configuration', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
          definition: AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.todo.auth.owner.sql, makeSqlDataSourceStrategy('MySQLDefinition')),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        const {
          resources: {
            cfnResources: { additionalCfnResources },
          },
        } = api;

        expect(additionalCfnResources).toBeDefined();
        const endpoints = Object.values(additionalCfnResources).filter((resource) => resource.cfnResourceType === 'AWS::EC2::VPCEndpoint');

        // 5 endpoints per SQL Lambda function. Update this test accordingly as we add additional data sources bound to separate functions.
        expect(endpoints.length).toBe(5);
      });

      it('provides the generated SQL Lambda function as an L1 construct without a VPC configuration', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const strategy = makeSqlDataSourceStrategy('MySQLDefinition', { vpcConfiguration: undefined });
        const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
          definition: AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.todo.auth.owner.sql, strategy),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        const {
          resources: {
            cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
            functions,
          },
        } = api;

        expect(cfnGraphqlApi).toBeDefined();
        expect(cfnGraphqlSchema).toBeDefined();
        expect(cfnApiKey).not.toBeDefined();
        expect(cfnDataSources).toBeDefined();

        const lambdaDataSource = Object.values(cfnDataSources).find((dataSource) => dataSource.type === 'AWS_LAMBDA');
        expect(lambdaDataSource).toBeDefined();
        expect(lambdaDataSource?.lambdaConfig).toBeDefined();

        expect(functions).toBeDefined();
        const sqlLambda = functions['RDSLambdaLogicalID'];
        expect(sqlLambda).toBeDefined();

        const cfnFn = sqlLambda.node.defaultChild as CfnFunction;
        const cfnFnVpcConfig = cfnFn.vpcConfig as CfnFunction.VpcConfigProperty | undefined;
        expect(cfnFnVpcConfig).toBeUndefined();
      });
    });

    describe('Custom SQL support', () => {
      it('provides SQL Lambda functions for schemas with both models and custom SQL inline queries', () => {
        throw new Error('Not yet implemented');
      });

      it('provides SQL Lambda functions for schemas with both models and custom SQL referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('provides SQL Lambda functions for schemas with both models and custom SQL with a mix of inline and referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('provides SQL Lambda functions for schemas with only custom SQL inline queries', () => {
        throw new Error('Not yet implemented');
      });

      it('provides SQL Lambda functions for schemas with only custom SQL referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('provides SQL Lambda functions for schemas with only custom SQL with a mix of inline and referenced queries', () => {
        throw new Error('Not yet implemented');
      });
    });
  });
});
