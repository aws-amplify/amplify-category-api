import { validateGraphql } from '../../graphql-request';
import { EndpointConfig, testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single GSI updated - Single Record',
  maxDeployDurationMs: 15 * 60 * 1000, // 15 Minutes
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
  dataSetup: async (endpointConfig: EndpointConfig): Promise<string> => {
    const result = await validateGraphql({
      ...endpointConfig,
      query: /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { field1: "field1Value" }) {
            id
          }
        }
      `,
      expectedStatusCode: 200,
    });
    return result.body.data.createTodo.id;
  },
  dataValidate: async (endpointConfig: EndpointConfig, state: string): Promise<void> => {
    const response = await validateGraphql({
      ...endpointConfig,
      query: /* GraphQL */ `
        query GET_TODO {
          getTodo(id: "${state}") { id }
        }
      `,
      expectedStatusCode: 200,
    });
    const retrievedTodo = response.body.data.getTodo;
    expect(retrievedTodo).toBeDefined();
    expect(retrievedTodo.id).toEqual(state);
  },
});
