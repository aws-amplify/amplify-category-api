import { Duration, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import fc from 'fast-check';
import { evaluateMappingTemplate, extractContextFromMappingResult, mergeTemplate } from '../../../../utils';
import { makeUserPoolsContext } from '../../../../utils/appsync-context';

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
    // eslint-disable-next-line jest/no-focused-tests
    test.each([
      { typeName: 'Query', fieldName: 'getTodo' },
      // { typeName: 'Query', fieldName: 'listTodos' },
      // { typeName: 'Mutation', fieldName: 'createTodo' },
    ])('$typeName/$fieldName', async ({ typeName, fieldName }) => {
      const mergedTemplate = mergeTemplate({ api, fieldName, typeName });

      const context = makeUserPoolsContext();
      const result = await evaluateMappingTemplate({ region, template: mergedTemplate, context });
      expect(result.error).toBeUndefined();
      expect(result.evaluationResult).toBeDefined();

      const appSyncContext = extractContextFromMappingResult(result.evaluationResult!);
      expect(appSyncContext).toBeDefined();
      const authFilter = appSyncContext.stash.authFilter;
      expect(authFilter).toBeDefined();
      expect(authFilter).toEqual({
        or: [
          {
            owner: {
              eq: 'uuid::my-username',
            },
          },
          {
            owner: {
              eq: 'uuid',
            },
          },
          {
            owner: {
              eq: 'my-username',
            },
          },
        ],
      });
    });
  });
});
