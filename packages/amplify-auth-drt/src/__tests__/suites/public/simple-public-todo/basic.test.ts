import { Duration, Stack } from 'aws-cdk-lib';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';

describe('public auth', () => {
  describe('basic', () => {
    const stack = new Stack();

    const api = new AmplifyGraphqlApi(stack, 'DrtTestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: Duration.days(2) },
      },
    });

    // For each field, concatenate all functions into a single mapping template for evaluation
    test.each([
      { typeName: 'Query', fieldName: 'getTodo' },
      { typeName: 'Query', fieldName: 'listTodos' },
      { typeName: 'Mutation', fieldName: 'createTodo' },
    ])('$typeName.$fieldName', ({ typeName, fieldName }) => {
      const templates = api.generatedFunctionSlots.filter((fn) => fn.typeName === typeName && fn.fieldName === fieldName);
      const content = templates.reduce((acc, curr) => `${acc}\n${curr.function.requestMappingTemplate}`, '');
      expect(content).toBeDefined();
      expect(content).not.toEqual('');
      console.log(`${typeName}.${fieldName} content:\n${content}`);
    });
  });

  describe('owner', () => {
    const stack = new Stack();

    const userPool = new UserPool(stack, 'DrtTestUserPool', {});

    const api = new AmplifyGraphqlApi(stack, 'DrtTestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `),
      authorizationModes: {
        defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
        apiKeyConfig: { expires: Duration.days(2) },
        userPoolConfig: { userPool },
      },
    });

    // For each field, concatenate all functions into a single mapping template for evaluation
    test.each([
      { typeName: 'Query', fieldName: 'getTodo' },
      { typeName: 'Query', fieldName: 'listTodos' },
      { typeName: 'Mutation', fieldName: 'createTodo' },
    ])('$typeName.$fieldName', ({ typeName, fieldName }) => {
      const templates = api.generatedFunctionSlots.filter((fn) => fn.typeName === typeName && fn.fieldName === fieldName);
      const content = templates.reduce((acc, curr) => `${acc}\n${curr.function.requestMappingTemplate}`, '');
      expect(content).toBeDefined();
      expect(content).not.toEqual('');
      console.log(`${typeName}.${fieldName} content:\n${content}`);
    });
  });
});
