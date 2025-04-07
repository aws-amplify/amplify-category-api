import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { ModelTransformer } from '../graphql-model-transformer';
import { SearchableModelTransformer } from '@aws-amplify/graphql-searchable-transformer';
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
        Author: {
          dbType: 'DYNAMODB' as const,
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
          tableName: 'Author-myApiId-myEnv',
        },
      },
    });
    expect(out).toBeDefined();
    const amplifyTableManagerStack = out.stacks[ITERATIVE_TABLE_STACK_NAME];
    expect(amplifyTableManagerStack).toBeDefined();
    // DynamoDB manager policy should be generated correctly
    const ddbManagerPolicy = Object.values(amplifyTableManagerStack.Resources!)
      .filter((resource) => resource.Type === 'AWS::IAM::Role')
      .flatMap((role: any) => role.Properties.Policies)
      .filter((policies: any) => policies !== undefined)
      .reduce((acc, value) => acc.concat(value), [])
      .find((policy: any) => policy.PolicyName === 'CreateUpdateDeleteTablesPolicy');
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
    expect(authorTable.Properties.deletionProtectionEnabled).toBe(true);
    validateModelSchema(parse(out.schema));

    // Outputs should contain a reference to the Arn to the entry point (onEventHandler)
    // of the provider for the AmplifyTableManager custom resource.
    // If any of these assertions should fail, it is likely caused by a change in the custom resource provider
    /** {@link Provider} */
    // !! This will result in broken redeployments !!
    // Friends don't let friends mutate custom resource entry point ARNs.
    const outputs = amplifyTableManagerStack.Outputs!;
    expect(outputs).toBeDefined();
    const rootStackName = 'transformerrootstack';
    const tableManagerStackName = 'AmplifyTableManager';
    const onEventHandlerName = 'TableManagerCustomProviderframeworkonEvent';
    // See https://github.com/aws/aws-cdk/blob/6fdc4582f659549021a64a4d676fce12fc241715/packages/aws-cdk-lib/core/lib/stack.ts#L1288-L1333 for more information
    const entryPointKeyStableLogicalIdHash = 'F1C8BD67';
    const onEventHandlerStableLogicalIdHash = '1DFC2ECC';

    const entrypointArnOutputsKey = `${rootStackName}${tableManagerStackName}${onEventHandlerName}${entryPointKeyStableLogicalIdHash}Arn`;
    const entryPointOutput = outputs[entrypointArnOutputsKey];

    const onEventHandlerResourceName = `${onEventHandlerName}${onEventHandlerStableLogicalIdHash}`;
    expect(entryPointOutput).toBeDefined();
    expect(entryPointOutput['Value']['Fn::GetAtt']).toEqual([
      onEventHandlerResourceName /* TableManagerCustomProviderframeworkonEvent1DFC2ECC */,
      'Arn',
    ]);

    // Since we verified above that the ARN for this resource is included in the stack outputs,
    // we know that the resource itself exists in the stack. But better safe than sorry.
    const amplifyTableManagerResources = amplifyTableManagerStack.Resources;
    expect(amplifyTableManagerResources).toBeDefined();
    const onEventHandlerLambda = amplifyTableManagerResources![onEventHandlerResourceName];
    expect(onEventHandlerLambda).toBeDefined();
  });

  it('should throw error when tableName is not set for imported table strategy', async () => {
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
        Post: {
          dbType: 'DYNAMODB' as const,
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        },
      },
    };
    // @ts-expect-error tableName is required on dataSourceStrategies.Post
    expect(() => testTransform(transformOption)).toThrow('No resource generator assigned for Post with dbType DYNAMODB');
  });

  it('should throw error when tableName is empty for imported table strategy', async () => {
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
        Post: {
          dbType: 'DYNAMODB' as const,
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
          tableName: '',
        },
      },
    };
    expect(() => testTransform(transformOption)).toThrow('No resource generator assigned for Post with dbType DYNAMODB');
  });

  it('should allow searchable on amplify managed table', async () => {
    const validSchema = `
    type Post @model @searchable {
      id: ID!
      title: String!
    }
  `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      dataSourceStrategies: {
        Post: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      },
    });
    expect(out).toBeDefined();
    expect(out.stacks.SearchableStack).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
  });
});
