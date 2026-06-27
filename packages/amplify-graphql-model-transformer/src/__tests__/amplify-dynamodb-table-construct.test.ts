import * as cdk from 'aws-cdk-lib';
import {
  AmplifyDynamoDBTable,
  CUSTOM_DDB_CFN_TYPE,
  CUSTOM_IMPORTED_DDB_CFN_TYPE,
} from '../resources/amplify-dynamodb-table/amplify-dynamodb-table-construct';
import { AttributeType, StreamViewType, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ArnPrincipal, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Match } from 'aws-cdk-lib/assertions';

describe('Amplify DynamoDB Table Construct Tests', () => {
  it('render the default amplify dynamodb table in correct form', () => {
    const stack = new cdk.Stack();
    const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
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
    // The correct template should be generated with default input
    template.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      ServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName',
      attributeDefinitions: [
        {
          attributeName: 'id',
          attributeType: 'S',
        },
      ],
      keySchema: [
        {
          attributeName: 'id',
          keyType: 'HASH',
        },
      ],
      streamSpecification: {
        streamViewType: 'NEW_AND_OLD_IMAGES',
      },
      provisionedThroughput: {
        readCapacityUnits: 5,
        writeCapacityUnits: 5,
      },
      sseSpecification: {
        sseEnabled: false,
      },
    });
    // The correct key schema of table should be returned
    expect(table.schema()).toEqual({
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });
  });
  it('render the correct template and index schema when GSIs are added', () => {
    const stack = new cdk.Stack();
    const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
      customResourceServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: TableEncryption.DEFAULT,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: {
        name: 'name',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'description',
        type: AttributeType.STRING,
      },
    });
    const template = Template.fromStack(stack);
    // The correct template should be generated for GSI
    template.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      globalSecondaryIndexes: [
        {
          indexName: 'gsi1',
          keySchema: [
            {
              attributeName: 'name',
              keyType: 'HASH',
            },
            {
              attributeName: 'description',
              keyType: 'RANGE',
            },
          ],
          projection: {
            projectionType: 'ALL',
          },
          provisionedThroughput: {
            readCapacityUnits: 5,
            writeCapacityUnits: 5,
          },
        },
      ],
    });
    // The correct schema of gsi should be returned
    expect(table.schema('gsi1')).toEqual({
      partitionKey: {
        name: 'name',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'description',
        type: AttributeType.STRING,
      },
    });
    // Error will be thrown when index does not exist
    expect(() => table.schema('notExist')).toThrow();
  });
  it('render the correct template when destructive updates and sandbox mode are allowed/undefined', () => {
    const stack = new cdk.Stack();
    new AmplifyDynamoDBTable(stack, 'MockTable1', {
      customResourceServiceToken: 'mockResourceServiceToken',
      allowDestructiveGraphqlSchemaUpdates: true,
      replaceTableUponGsiUpdate: true,
      tableName: 'mockTableName1',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });
    new AmplifyDynamoDBTable(stack, 'MockTable2', {
      customResourceServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName2',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      tableName: 'mockTableName1',
      allowDestructiveGraphqlSchemaUpdates: true,
      replaceTableUponGsiUpdate: true,
    });
    template.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      tableName: 'mockTableName2',
      allowDestructiveGraphqlSchemaUpdates: false,
      replaceTableUponGsiUpdate: false,
    });
  });
  it('render the imported amplify dynamodb table in correct form', () => {
    const stack = new cdk.Stack();
    new AmplifyDynamoDBTable(stack, 'MockTable', {
      customResourceServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      isImported: true,
    });
    const template = Template.fromStack(stack);
    // The correct template should be generated with default input
    template.hasResourceProperties(CUSTOM_IMPORTED_DDB_CFN_TYPE, {
      ServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName',
      isImported: true,
    });
  });

  describe('grantStreamRead', () => {
    it('grants read access table stream', () => {
      const stack = new cdk.Stack();
      const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
        customResourceServiceToken: 'mockResourceServiceToken',
        tableName: 'mockTableName',
        partitionKey: {
          name: 'id',
          type: AttributeType.STRING,
        },
        encryptionKey: new Key(stack, 'MockKey', {}),
        stream: StreamViewType.NEW_AND_OLD_IMAGES,
      });
      table.grantStreamRead(
        new Role(stack, 'MockRole', {
          assumedBy: new ArnPrincipal('mock_principal'),
        }),
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            {
              Action: ['dynamodb:ListStreams', 'dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator'],
              Effect: 'Allow',
              Resource: {
                'Fn::GetAtt': ['MockTable', 'TableStreamArn'],
              },
            },
          ]),
        }),
      });
    });

    it('throws when stream arn is undefined', () => {
      const stack = new cdk.Stack();
      const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
        customResourceServiceToken: 'mockResourceServiceToken',
        tableName: 'mockTableName',
        partitionKey: {
          name: 'id',
          type: AttributeType.STRING,
        },
        isImported: true,
      });

      expect(() =>
        table.grantStreamRead(
          new Role(stack, 'MockRole', {
            assumedBy: new ArnPrincipal('mock_principal'),
          }),
        ),
      ).toThrow('No stream ARNs found on the table Default/MockTable');
    });
  });

  it('grants access to encryption key', () => {
    const stack = new cdk.Stack();
    const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
      customResourceServiceToken: 'mockResourceServiceToken',
      tableName: 'mockTableName',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      encryptionKey: new Key(stack, 'MockKey', {}),
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });
    table.grantStreamRead(
      new Role(stack, 'MockRole', {
        assumedBy: new ArnPrincipal('mock_principal'),
      }),
    );
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['kms:Decrypt', 'kms:DescribeKey'],
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  describe('tableFromAttr', () => {
    describe('grantReadData', () => {
      it('grants read access to table and indexes', () => {
        const stack = new cdk.Stack();
        const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
          customResourceServiceToken: 'mockResourceServiceToken',
          tableName: 'mockTableName',
          partitionKey: {
            name: 'id',
            type: AttributeType.STRING,
          },
        });
        table.addGlobalSecondaryIndex({
          indexName: 'gsi1',
          partitionKey: {
            name: 'name',
            type: AttributeType.STRING,
          },
        });

        table.tableFromAttr.grantReadData(
          new Role(stack, 'MockRole', {
            assumedBy: new ArnPrincipal('mock_principal'),
          }),
        );

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: [
                  'dynamodb:BatchGetItem',
                  'dynamodb:GetRecords',
                  'dynamodb:GetShardIterator',
                  'dynamodb:Query',
                  'dynamodb:GetItem',
                  'dynamodb:Scan',
                  'dynamodb:ConditionCheckItem',
                  'dynamodb:DescribeTable',
                ],
                Effect: 'Allow',
                Resource: Match.arrayWith([
                  {
                    'Fn::GetAtt': ['MockTable', 'TableArn'],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['MockTable', 'TableArn'],
                        },
                        '/index/*',
                      ],
                    ],
                  },
                ]),
              }),
            ]),
          }),
        });
      });
    });

    describe('grantReadWriteData', () => {
      it('grants read and write access to table and indexes', () => {
        const stack = new cdk.Stack();
        const table = new AmplifyDynamoDBTable(stack, 'MockTable', {
          customResourceServiceToken: 'mockResourceServiceToken',
          tableName: 'mockTableName',
          partitionKey: {
            name: 'id',
            type: AttributeType.STRING,
          },
        });
        table.addGlobalSecondaryIndex({
          indexName: 'gsi1',
          partitionKey: {
            name: 'name',
            type: AttributeType.STRING,
          },
        });

        table.tableFromAttr.grantReadWriteData(
          new Role(stack, 'MockRole', {
            assumedBy: new ArnPrincipal('mock_principal'),
          }),
        );

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: [
                  'dynamodb:BatchGetItem',
                  'dynamodb:GetRecords',
                  'dynamodb:GetShardIterator',
                  'dynamodb:Query',
                  'dynamodb:GetItem',
                  'dynamodb:Scan',
                  'dynamodb:ConditionCheckItem',
                  'dynamodb:BatchWriteItem',
                  'dynamodb:PutItem',
                  'dynamodb:UpdateItem',
                  'dynamodb:DeleteItem',
                  'dynamodb:DescribeTable',
                ],
                Effect: 'Allow',
                Resource: Match.arrayWith([
                  {
                    'Fn::GetAtt': ['MockTable', 'TableArn'],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['MockTable', 'TableArn'],
                        },
                        '/index/*',
                      ],
                    ],
                  },
                ]),
              }),
            ]),
          }),
        });
      });
    });
  });
});
