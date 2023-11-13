import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { SqlModelDataSourceDbConnectionConfig, VpcConfig } from '../../types';

const defaultSchema = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: owner }]) {
    id: ID! @primaryKey
    description: String!
  }
`;

const vpcConfiguration: VpcConfig = {
  vpcId: 'vpc-123abc',
  securityGroupIds: ['sg-123abc'],
  subnetAvailabilityZoneConfig: [{ subnetId: 'subnet-123abc', availabilityZone: 'us-east-1a' }],
};

const dbConnectionConfig: SqlModelDataSourceDbConnectionConfig = {
  hostnameSsmPath: '/ssm/path/hostnameSsmPath',
  usernameSsmPath: '/ssm/path/usernameSsmPath',
  passwordSsmPath: '/ssm/path/passwordSsmPath',
  databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
  portSsmPath: '/ssm/path/portSsmPath',
};

describe('sql-bound API generated resource access', () => {
  describe('l1 resources', () => {
    describe('singleton appsync resources', () => {
      it('provides the generated SQL Lambda function as an L1 construct with a VPC configuration', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
          definition: AmplifyGraphqlDefinition.fromString(defaultSchema, {
            name: 'MySQLDefinition',
            dbType: 'MYSQL',
            vpcConfiguration,
            dbConnectionConfig,
          }),
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
          definition: AmplifyGraphqlDefinition.fromString(defaultSchema, {
            name: 'MySQLDefinition',
            dbType: 'MYSQL',
            vpcConfiguration,
            dbConnectionConfig,
          }),
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
        const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
          definition: AmplifyGraphqlDefinition.fromString(defaultSchema, {
            name: 'MySQLDefinition',
            dbType: 'MYSQL',
            dbConnectionConfig,
          }),
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
  });
});
