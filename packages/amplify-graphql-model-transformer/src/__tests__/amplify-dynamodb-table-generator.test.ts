import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '../graphql-model-transformer';
import { constructDataSourceMap, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { CUSTOM_DDB_CFN_TYPE } from '../resources/amplify-dynamodb-table/amplify-dynamodb-table-construct';
import { ITERATIVE_TABLE_STACK_NAME } from '../resources/amplify-dynamodb-table/amplify-dynamo-model-resource-generator';
import { DynamoDBProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';

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
    const modelToDatasourceMap = constructDataSourceMap(validSchema, {
      dbType: 'DDB',
      provisionDB: true,
      provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
    });
    modelToDatasourceMap.set('Post', { dbType: 'DDB', provisionDB: true, provisionStrategy: DynamoDBProvisionStrategy.AMPLIFY_TABLE });
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      modelToDatasourceMap,
    });
    expect(out).toBeDefined();
    const amplifyTableManagerStack = out.stacks[ITERATIVE_TABLE_STACK_NAME];
    expect(amplifyTableManagerStack).toBeDefined();
    // DynamoDB manager policy should be generated correctly
    const policyKey = Object.keys(amplifyTableManagerStack.Resources!).find((r) => r.includes('CreateUpdateDeleteTablesPolicy'));
    const ddbManagerPolicy = amplifyTableManagerStack.Resources![`${policyKey}`];
    expect(ddbManagerPolicy).toBeDefined();
    expect(ddbManagerPolicy).toMatchSnapshot();
    // Post table resource should be generated within the custom table type
    const postStack = out.stacks['Post'];
    expect(postStack).toBeDefined();
    const postTable = postStack.Resources?.PostTable;
    expect(postTable).toBeDefined();
    expect(postTable.Type).toBe(CUSTOM_DDB_CFN_TYPE);
    // Comment table resource should be generated within the default CFN DynamoDB table
    const commentStack = out.stacks['Comment'];
    expect(commentStack).toBeDefined();
    const commentTable = commentStack.Resources?.CommentTable;
    expect(commentTable).toBeDefined();
    expect(commentTable.Type).toBe('AWS::DynamoDB::Table');
    validateModelSchema(parse(out.schema));
  });
});
