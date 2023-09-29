import { getNextGSIUpdate } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as CustomDDB from '../resources/amplify-dynamodb-table/amplify-table-types';
import { DynamoDB } from 'aws-sdk';

describe('Custom Resource Lambda Tests', () => {
  describe('Get next GSI update', () => {
    const endState: CustomDDB.Input = {
      TableName: 'test-table',
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
      KeySchema: [
        {
          AttributeName: 'pk',
          KeyType: 'HASH',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
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
});
