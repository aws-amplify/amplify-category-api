import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '../graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { CUSTOM_DDB_CFN_TYPE } from '../resources/amplify-dynamodb-table/amplify-dynamodb-table-construct';

describe('ModelTransformer:', () => {
  it('should successfully transform simple valid schema', async () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
      }
      type Comment @model {
        id: ID!
        content: String
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
    // DynamoDB manager policy should be generated correctly
    const policyKey = Object.keys(out.rootStack.Resources!).find((r) => r.includes('CreateUpdateDeleteTablesPolicy'));
    const ddbManagerPolicy = out.rootStack.Resources![`${policyKey}`];
    expect(ddbManagerPolicy).toBeDefined();
    expect(ddbManagerPolicy).toMatchSnapshot();
    // Post table resource should be generated within the custom table type
    const postStack = out.stacks['Post'];
    expect(postStack).toBeDefined();
    const postTable = postStack.Resources?.PostTable;
    expect(postTable).toBeDefined();
    expect(postTable.Type).toBe(CUSTOM_DDB_CFN_TYPE);
    validateModelSchema(parse(out.schema));
  });
});
