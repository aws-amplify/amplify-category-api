import { validateGraphql } from '../../graphql-request';
import { EndpointConfig, generateFakeUUIDs, splitArray, testManagedTableDeployment } from './deploy-velocity-test-core';

const RECORD_COUNT = 1000;

testManagedTableDeployment({
  name: 'Single GSI updated - 1k Records',
  testDurationLimitMs: 30 * 60 * 1000, // 30 Minutes
  initialSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String!
    }
  `,
  updatedSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String! @index
    }
  `,
  dataSetup: async (endpointConfig: EndpointConfig): Promise<void> => {
    // Generate records in parallel, 20 at a time.
    for (const uuidBatch of splitArray(generateFakeUUIDs(RECORD_COUNT), 20)) {
      await Promise.all(
        uuidBatch.map((uuid) =>
          validateGraphql({
            ...endpointConfig,
            // TODO: Actually run batch inserts
            query: /* GraphQL */ `
          mutation CREATE_TODO {
            createTodo(input: { field1: "${uuid}" }) {
              id
            }
          }
        `,
            expectedStatusCode: 200,
          }),
        ),
      );
    }
  },
  dataValidate: async (endpointConfig: EndpointConfig): Promise<void> => {
    let nextToken = null;
    let resultCount = 0;
    do {
      const response = await validateGraphql({
        ...endpointConfig,
        query: /* GraphQL */ `
        query LIST_TODOS {
          listTodos({ nextToken: ${nextToken ? `"${nextToken}"` : 'null'}}) {
            items {
              id
            }
            nextToken
          }
        }
      `,
        expectedStatusCode: 200,
      });
      nextToken = response.body.data.listTodos.nextToken;
      resultCount += response.body.data.listTodos.items.length;
    } while (nextToken);
    expect(resultCount).toEqual(RECORD_COUNT);
  },
});
