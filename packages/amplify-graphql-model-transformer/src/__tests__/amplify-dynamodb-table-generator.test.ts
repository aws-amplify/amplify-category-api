import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  validateModelSchema,
  IMPORTED_DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
} from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { ModelTransformer } from '../graphql-model-transformer';
import { CUSTOM_DDB_CFN_TYPE, CUSTOM_IMPORTED_DDB_CFN_TYPE } from '../resources/amplify-dynamodb-table/amplify-dynamodb-table-construct';
import { ITERATIVE_TABLE_STACK_NAME } from '../resources/amplify-dynamodb-table/amplify-dynamo-model-resource-generator';

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
      type Author @model {
        id: ID!
        name: String
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      dataSourceStrategies: {
        Comment: DDB_DEFAULT_DATASOURCE_STRATEGY,
        Post: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        Author: IMPORTED_DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      },
      importedAmplifyDynamoDBTableMap: {
        Author: 'Author-myApiId-myEnv',
      },
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
    // Author table resource should be generated within the imported amplify DynamoDB table
    const authorStack = out.stacks['Author'];
    expect(authorStack).toBeDefined();
    const authorTable = authorStack.Resources?.AuthorTable;
    expect(authorTable).toBeDefined();
    expect(authorTable.Type).toBe(CUSTOM_IMPORTED_DDB_CFN_TYPE);
    expect(authorTable.UpdateReplacePolicy).toBe('Retain');
    expect(authorTable.DeletionPolicy).toBe('Retain');
    expect(authorTable.Properties.isImported).toBe(true);
    expect(authorTable.Properties.tableName).toBe('Author-myApiId-myEnv');
    // Validate schema
    validateModelSchema(parse(out.schema));
  });
  it('should throw error when the mapping is not provided for model of imported table strategy', async () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
      }
    `;
    const transformOption = {
      schema: validSchema,
      transformers: [new ModelTransformer()],
      dataSourceStrategies: {
        Post: IMPORTED_DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      },
    };
    expect(() => testTransform(transformOption)).toThrowErrorMatchingInlineSnapshot(`"Cannot find imported table mapping for model Post"`);
  });
});
