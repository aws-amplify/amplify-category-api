import * as cdk from 'aws-cdk-lib';
import { AmplifyDynamoDBTable, CUSTOM_DDB_CFN_TYPE } from '../resources/amplify-dynamodb-table/amplify-dynamodb-table-construct';
import { AttributeType, StreamViewType, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Template } from 'aws-cdk-lib/assertions';

describe('Amplify DynamoDB Table Construct Tests', () => {
  it('render the custom type for amplify dynamodb table', () => {
    const stack = new cdk.Stack();
    new AmplifyDynamoDBTable(stack, 'MockTable', {
      customResourceServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: TableEncryption.DEFAULT,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      tableName: 'mockTableName',
    });
  });
});
