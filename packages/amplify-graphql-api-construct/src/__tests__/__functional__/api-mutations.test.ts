import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as elasticsearch from 'aws-cdk-lib/aws-elasticsearch';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-secretsmanager';
import { Template } from 'aws-cdk-lib/assertions';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('api mutations', () => {
  describe('data sources', () => {
    it('allows adding a dynamodb datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const table = new dynamodb.Table(stack, 'TestTable', {
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      api.addDynamoDbDataSource('TestDynamoDbDataSource', table);

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestDynamoDbDataSource',
        Type: 'AMAZON_DYNAMODB',
        DynamoDBConfig: {},
      });
    });

    it('allows adding an elasticsearch datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const domain = new elasticsearch.Domain(stack, 'TestDomain', {
        version: elasticsearch.ElasticsearchVersion.V6_7,
      });

      api.addElasticsearchDataSource('TestElasticsearchDataSource', domain);

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestElasticsearchDataSource',
        Type: 'AMAZON_ELASTICSEARCH',
        ElasticsearchConfig: {},
      });
    });

    it('allows adding an eventbridge datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const eventBus = new events.EventBus(stack, 'TestBus');

      api.addEventBridgeDataSource('TestEventBridgeDataSource', eventBus);

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestEventBridgeDataSource',
        Type: 'AMAZON_EVENTBRIDGE',
        EventBridgeConfig: {},
      });
    });

    it('allows adding an http datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      api.addHttpDataSource('TestHTTPDataSource', 'https://docs.aws.amazon.com/');

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestHTTPDataSource',
        Type: 'HTTP',
        HttpConfig: {
          Endpoint: 'https://docs.aws.amazon.com/',
        },
      });
    });

    it('allows adding a lambda datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const mockFunction = {
        functionArn: 'TestArn',
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        grantInvoke: (_: any) => {},
      } as IFunction;

      api.addLambdaDataSource('TestLambdaDataSource', mockFunction);

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestLambdaDataSource',
        Type: 'AWS_LAMBDA',
        LambdaConfig: {
          LambdaFunctionArn: 'TestArn',
        },
      });
    });

    it('allows adding a NONE datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      api.addNoneDataSource('TestNoneDataSource');

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestNoneDataSource',
        Type: 'NONE',
      });
    });

    it('allows adding a opensearch datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const domain = new opensearch.Domain(stack, 'TestDomain', {
        version: opensearch.EngineVersion.ELASTICSEARCH_5_1,
      });

      api.addOpenSearchDataSource('TestOpenSearchDataSource', domain);

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestOpenSearchDataSource',
        Type: 'AMAZON_OPENSEARCH_SERVICE',
        OpenSearchServiceConfig: {},
      });
    });

    it('allows adding an rds datasource', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const cluster = rds.ServerlessCluster.fromServerlessClusterAttributes(stack, 'ImportedCluster', { clusterIdentifier: 'MyClusterId' });
      const secret = ssm.Secret.fromSecretNameV2(stack, 'ImportedSecret', 'SecretName');
      api.addRdsDataSource('TestRdsDataSource', cluster, secret);

      Template.fromStack(stack).hasResourceProperties('AWS::AppSync::DataSource', {
        Name: 'TestRdsDataSource',
        Type: 'RELATIONAL_DATABASE',
        RelationalDatabaseConfig: {},
      });
    });
  });

  it('allows adding resolvers', () => {
    const stack = new cdk.Stack();

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }

        type Query {
          writeToBus(message: String): String
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    const eventBus = new events.EventBus(stack, 'TestBus');

    api.addResolver('writeToBusResolver', {
      dataSource: api.addEventBridgeDataSource('MyEventBusDataSource', eventBus, {}),
      typeName: 'Mutation',
      fieldName: 'writeToBus',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`{
        "version": "2018-05-29",
        "operation": "PutEvents",
        "events": [{
            "source": "appsync",
            "detail": { 
                "message": $util.toJson($ctx.arguments.message)
            },
            "detailType": "some detail type"
        }]
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson({})'),
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::Resolver', 1);
    template.hasResourceProperties('AWS::AppSync::Resolver', {
      DataSourceName: 'MyEventBusDataSource',
      TypeName: 'Mutation',
      FieldName: 'writeToBus',
      Kind: 'UNIT',
    });
  });

  it('allows adding functions', () => {
    const stack = new cdk.Stack();

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }

        type Query {
          writeToBus(message: String): String
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    const eventBus = new events.EventBus(stack, 'TestBus');

    api.addFunction('writeToBusResolver', {
      name: 'WriteToTheBus',
      dataSource: api.addEventBridgeDataSource('MyEventBusDataSource', eventBus, {}),
      requestMappingTemplate: appsync.MappingTemplate.fromString(`{
        "version": "2018-05-29",
        "operation": "PutEvents",
        "events": [{
            "source": "appsync",
            "detail": { 
                "message": $util.toJson($ctx.arguments.message)
            },
            "detailType": "some detail type"
        }]
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson({})'),
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
    template.hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      Name: 'WriteToTheBus',
      DataSourceName: 'MyEventBusDataSource',
    });
  });
});
