import { getNextGSIUpdate } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as CustomDDB from '../resources/amplify-dynamodb-table/amplify-table-types';
import { DynamoDB } from 'aws-sdk';
import { extractTableInputFromEvent } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import { RequestType } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda-types';

describe('Custom Resource Lambda Tests', () => {
  describe('Get next GSI update', () => {
    const endState: CustomDDB.Input = {
      tableName: 'test-table',
      attributeDefinitions: [
        {
          attributeName: 'pk',
          attributeType: 'S',
        },
        {
          attributeName: 'sk',
          attributeType: 'S',
        },
        {
          attributeName: 'newKey',
          attributeType: 'S',
        },
      ],
      keySchema: [
        {
          attributeName: 'pk',
          keyType: 'HASH',
        },
      ],
      billingMode: 'PAY_PER_REQUEST',
      globalSecondaryIndexes: [
        {
          indexName: 'gsi2',
          keySchema: [
            {
              attributeName: 'sk',
              keyType: 'HASH',
            },
          ],
          projection: {
            projectionType: 'ALL',
          },
        },
        {
          indexName: 'gsi3',
          keySchema: [
            {
              attributeName: 'newKey',
              keyType: 'HASH',
            },
          ],
          projection: {
            projectionType: 'ALL',
          },
        },
      ],
    };
    it('should compute deletion correctly', () => {
      const currentState: DynamoDB.TableDescription = {
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'sk',
            AttributeType: 'S',
          },
        ],
        TableName: 'test-table',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
        ],
        BillingModeSummary: {
          BillingMode: 'PAY_PER_REQUEST',
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: 'gsi1',
            KeySchema: [
              {
                AttributeName: 'sk',
                KeyType: 'HASH',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
            IndexStatus: 'ACTIVE',
          },
        ],
      };
      const nextUpdate = getNextGSIUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('should compute addition correctly', () => {
      const currentState: DynamoDB.TableDescription = {
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'sk',
            AttributeType: 'S',
          },
        ],
        TableName: 'test-table',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
        ],
        BillingModeSummary: {
          BillingMode: 'PAY_PER_REQUEST',
        },
        GlobalSecondaryIndexes: [],
      };
      const nextUpdate = getNextGSIUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('should compute next addition correctly', () => {
      const currentState: DynamoDB.TableDescription = {
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'sk',
            AttributeType: 'S',
          },
        ],
        TableName: 'test-table',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
        ],
        BillingModeSummary: {
          BillingMode: 'PAY_PER_REQUEST',
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: 'gsi2',
            KeySchema: [
              {
                AttributeName: 'sk',
                KeyType: 'HASH',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
            IndexStatus: 'ACTIVE',
          },
        ],
      };
      const nextUpdate = getNextGSIUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('should compute end state correctly in which no additional update step is defined', () => {
      const currentState: DynamoDB.TableDescription = {
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'sk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'newKey',
            AttributeType: 'S',
          },
        ],
        TableName: 'test-table',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
        ],
        BillingModeSummary: {
          BillingMode: 'PAY_PER_REQUEST',
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: 'gsi2',
            KeySchema: [
              {
                AttributeName: 'sk',
                KeyType: 'HASH',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
            IndexStatus: 'ACTIVE',
          },
          {
            IndexName: 'gsi3',
            KeySchema: [
              {
                AttributeName: 'newKey',
                KeyType: 'HASH',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
            IndexStatus: 'ACTIVE',
          },
        ],
      };
      const nextUpdate = getNextGSIUpdate(currentState, endState);
      expect(nextUpdate).toBeUndefined();
    });
  });
  describe('Extract table definition input from event test', () => {
    it('should extract the correct table definition from event object', () => {
      const mockEvent = {
        ServiceToken: 'mockServiceToken',
        ResponseURL: 'mockResponseURL',
        StackId: 'mockStackId',
        RequestId: 'mockRequestId',
        LogicalResourceId: 'mockLogicalResourceId',
        ResourceType: 'mockResourceType',
        RequestType: 'Create' as RequestType,
        ResourceProperties: {
          ServiceToken: 'mockServiceToken',
          tableName: 'mockTableName',
          attributeDefinitions: [
            {
              attributeName: 'todoId',
              attributeType: 'S',
            },
            {
              attributeName: 'name',
              attributeType: 'S',
            },
            {
              attributeName: 'name2',
              attributeType: 'S',
            },
          ],
          keySchema: [
            {
              attributeName: 'todoId',
              keyType: 'HASH',
            },
            {
              attributeName: 'name',
              keyType: 'RANGE',
            },
          ],
          globalSecondaryIndexes: [
            {
              indexName: 'byName2',
              keySchema: [
                {
                  attributeName: 'name2',
                  keyType: 'HASH',
                },
              ],
              projection: {
                projectionType: 'ALL',
              },
              provisionedThroughput: {
                readCapacityUnits: '5',
                writeCapacityUnits: '5',
              },
            },
          ],
          billingMode: 'PROVISIONED',
          provisionedThroughput: {
            readCapacityUnits: '5',
            writeCapacityUnits: '5',
          },
          sseSpecification: {
            sseEnabled: 'true',
          },
          streamSpecification: {
            streamViewType: 'NEW_AND_OLD_IMAGES',
          },
        },
      };
      const tableDef = extractTableInputFromEvent(mockEvent);
      expect(tableDef).toMatchSnapshot();
    });
  });
});
