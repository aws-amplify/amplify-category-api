import { validateGraphql } from '../../graphql-request';
import {
  DURATION_30_MINUTES,
  SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
} from './deploy-velocity-constants';
import { EndpointConfig, testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Replace 2 GSIs updated - Single Record',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
  updatedSchema: SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  dataSetup: async (endpointConfig: EndpointConfig): Promise<string> => {
    const result = await validateGraphql({
      ...endpointConfig,
      query: /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { field1: "field1Value", field2: "field2Value", field3: "field3Value", field4: "field4Value" }) {
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
