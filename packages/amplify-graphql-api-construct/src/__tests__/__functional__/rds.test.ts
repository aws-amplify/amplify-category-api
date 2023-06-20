import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';

/**
 * Utility to wrap construct creation a basic synth step to smoke test
 * @param buildApp callback to create the resources in the stack
 */
const verifySynth = (buildApp: (stack: cdk.Stack) => void): void => {
  const stack = new cdk.Stack();
  buildApp(stack);
  Template.fromStack(stack);
};

describe('data sources', () => {
  it('synths with rds on a single model', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        dataSourceMapping: {
          models: {
            Todo: 'MyDatabase',
          },
        },
        existingDataSources: {
          MyDatabase: {
            dbType: 'MySQL',
            provisionDB: false,
            connection: {
              username: '',
              password: '',
              host: '',
              database: '',
              port: 0,
            },
          },
        },
      });
    });
  });

  it('synths with rds on the whole project', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        dataSourceMapping: {
          project: 'MyDatabase',
        },
        existingDataSources: {
          MyDatabase: {
            dbType: 'MySQL',
            provisionDB: false,
            connection: {
              username: '',
              password: '',
              host: '',
              database: '',
              port: 0,
            },
          },
        },
      });
    });
  });
});
