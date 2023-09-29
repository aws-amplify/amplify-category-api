import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '../graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import {
  CUSTOM_DDB_CFN_TYPE,
  ITERATIVE_TABLE_STACK_NAME,
} from '../resources/amplify-dynamodb-table/amplify-dynamo-model-resource-generator';

describe('ModelTransformer:', () => {
  it('should successfully transform simple valid schema', async () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        useAmplifyManagedTableResources: true,
      },
    });
    expect(out).toBeDefined();
    // Nested stack AmplifyTableManager should be generated with
    // CDK custom resource provider framework resources
    const amplifyTableManagerStack = out.stacks[ITERATIVE_TABLE_STACK_NAME];
    expect(amplifyTableManagerStack).toBeDefined();
    // Post table resource should be generated within the custom table type
    const postStack = out.stacks['Post'];
    expect(postStack).toBeDefined();
    const postTable = postStack.Resources?.PostTable;
    expect(postTable).toBeDefined();
    expect(postTable.Type).toBe(CUSTOM_DDB_CFN_TYPE);
    validateModelSchema(parse(out.schema));
  });
});
