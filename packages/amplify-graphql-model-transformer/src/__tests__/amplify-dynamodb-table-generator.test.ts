import {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { ModelTransformer } from '../graphql-model-transformer';
import { ITERATIVE_TABLE_STACK_NAME } from '../resources/amplify-dynamodb-table/amplify-dynamo-model-resource-generator';
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
      dataSourceStrategies: {
        Comment: DDB_DEFAULT_DATASOURCE_STRATEGY,
        Post: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
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
    validateModelSchema(parse(out.schema));

    // Outputs should contain a reference to the Arn to the entry point (onEventHandler)
    // of the provider for the AmplifyTableManager custom resource.
    // If any of these assertions should fail, it is likely caused by a change in the custom resource provider
    /** {@link Provider} */ // that caused the entry point ARN to change.
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
});
