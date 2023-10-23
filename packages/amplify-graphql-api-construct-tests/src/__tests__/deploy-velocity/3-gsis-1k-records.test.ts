import { validateGraphql } from '../../graphql-request';
import { EndpointConfig, generateFakeUUIDs, splitArray, testManagedTableDeployment } from './deploy-velocity-test-core';

const RECORD_COUNT = 1000;

testManagedTableDeployment({
  name: '3 GSIs updated - 1k Records',
  maxDeployDurationMs: 30 * 60 * 1000, // 30 Minutes
  initialSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String!
      field2: String!
      field3: String!
    }
  `,
  updatedSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String! @index
      field2: String! @index
      field3: String! @index
    }
  `,
  dataSetup: async (endpointConfig: EndpointConfig): Promise<void> => {
    // Generate Data in batches of 50 per request
    const mutationBatches = splitArray(generateFakeUUIDs(RECORD_COUNT), 50).map((uuidBatch) =>
      uuidBatch
        .map((uuid, i) => `mut${i}: createTodo(input: { field1: "${uuid}", field2: "${uuid}", field3: "${uuid}" }) { id }`)
        .join('/n'),
    );

    // And execute up to 10 requests in parallel
    for (const mutationBatch of splitArray(mutationBatches, 10)) {
      await Promise.all(
        mutationBatch.map((mutations) =>
          validateGraphql({
            ...endpointConfig,
            query: /* GraphQL */ `mutation CREATE_TODO { ${mutations} }`,
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
            listTodos(nextToken: ${nextToken ? `"${nextToken}"` : 'null'}) {
              items { id }
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
