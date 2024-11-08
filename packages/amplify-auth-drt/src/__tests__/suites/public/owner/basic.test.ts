import { Duration, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { evaluateMappingTemplate } from '../../../../utils';
import { AppSyncIdentityCognitoUserPools } from '../../../../utils/appsync-context';

const region = process.env.AWS_REGION || 'us-west-2';

describe('owner auth', () => {
  describe('happy path', () => {
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
    ])('$typeName/$fieldName', async ({ typeName, fieldName }) => {
      const templates = api.generatedFunctionSlots.filter((fn) => fn.typeName === typeName && fn.fieldName === fieldName);
      const mergedTemplate = templates.reduce((acc, curr) => `${acc}\n${curr.function.requestMappingTemplate}`, '');

      const result = await evaluateMappingTemplate({ region, template: mergedTemplate });
      expect(result.error).toEqual({ message: 'Unauthorized' });
      expect(result.evaluationResult).toBeUndefined();
    });
  });

  describe('auth mode not configured, valid credentials passed', () => {
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
    ])('$typeName/$fieldName', async ({ typeName, fieldName }) => {
      const templates = api.generatedFunctionSlots.filter((fn) => fn.typeName === typeName && fn.fieldName === fieldName);
      const mergedTemplate = templates.reduce((acc, curr) => `${acc}\n${curr.function.requestMappingTemplate}`, '');

      const identity: AppSyncIdentityCognitoUserPools = {
        sourceIp: ['127.0.0.1'],
        username: 'tester',
        groups: null,
        sub: '00000000-0000-0000-0000-000000000000',
        issuer: 'test-issuer',
        claims: {},
        defaultAuthStrategy: 'DENY',
      };

      const result = await evaluateMappingTemplate({
        region,
        template: mergedTemplate,
        partialContext: {
          identity,
        },
      });
      expect(result.error).toBeUndefined();

      // TODO: Figure out how to check for filter expressions. Am I merging too many templates?
      expect(result.evaluationResult).toBeUndefined();
    });
  });

  describe('auth mode configured but invalid auth credentials passed', () => {
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
    ])('$typeName/$fieldName', async ({ typeName, fieldName }) => {
      const templates = api.generatedFunctionSlots.filter((fn) => fn.typeName === typeName && fn.fieldName === fieldName);
      const mergedTemplate = templates.reduce((acc, curr) => `${acc}\n${curr.function.requestMappingTemplate}`, '');

      // Empty context == API key auth, expect failure
      const result = await evaluateMappingTemplate({ region, template: mergedTemplate });
      expect(result.error).toEqual({ message: 'Unauthorized' });
      expect(result.evaluationResult).toBeUndefined();
    });
  });
});
