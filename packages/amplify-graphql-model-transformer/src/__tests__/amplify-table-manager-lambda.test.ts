import {
  TableDescription,
  UpdateTableCommandInput,
  UpdateTimeToLiveCommandInput,
  TimeToLiveDescription,
  UpdateContinuousBackupsCommandInput,
  ContinuousBackupsDescription,
  ContinuousBackupsUnavailableException,
  InternalServerError,
} from '@aws-sdk/client-dynamodb';
import {
  getNextAtomicUpdate,
  toCreateTableInput,
  getStreamUpdate,
  getTtlUpdate,
  getSseUpdate,
  getPointInTimeRecoveryUpdate,
  getDeletionProtectionUpdate,
  extractOldTableInputFromEvent,
  isTtlModified,
  processIsComplete,
  processOnEvent,
} from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as ddbTableManagerLambda from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as CustomDDB from '../resources/amplify-dynamodb-table/amplify-table-types';
import { extractTableInputFromEvent } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import { RequestType } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda-types';

jest.spyOn(ddbTableManagerLambda, 'getLambdaTags').mockReturnValue(
  Promise.resolve([
    { Key: 'key1', Value: 'value1' },
    { Key: 'key2', Value: 'value2' },
    { Key: 'key3', Value: 'value3' },
  ]),
);

// Mock client-ssm
const mockDescribeTable = jest.fn();
const mockDescribeContinuousBackups = jest.fn();
const mockUpdateContinuousBackups = jest.fn();
const mockUpdateTable = jest.fn();
const mockTagResource = jest.fn();
const mockUntagResource = jest.fn();
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-dynamodb'),
    DynamoDB: jest.fn().mockImplementation(() => ({
      describeTable: (input: any) => mockDescribeTable(input),
      describeContinuousBackups: (input: any) => mockDescribeContinuousBackups(input),
      updateContinuousBackups: (input: any) => mockUpdateContinuousBackups(input),
      updateTable: (input: any) => mockUpdateTable(input),
      tagResource: (input: any) => mockTagResource(input),
      untagResource: (input: any) => mockUntagResource(input),
      send: (input: any) => mockSend(input),
    })),
  };
});

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
      const currentState: TableDescription = {
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
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('should compute addition correctly', () => {
      const currentState: TableDescription = {
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
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('should compute next addition correctly', () => {
      const currentState: TableDescription = {
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
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('should compute end state correctly in which no additional update step is defined', () => {
      const currentState: TableDescription = {
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
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toBeUndefined();
    });
  });
  describe('Compute GSI deletion', () => {
    const currentState: TableDescription = {
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
    const baseTableDef = {
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
      ],
      keySchema: [
        {
          attributeName: 'pk',
          keyType: 'HASH',
        },
      ],
      billingMode: 'PAY_PER_REQUEST',
    };
    it('when the index is removed completely', () => {
      const endState: CustomDDB.Input = {
        ...baseTableDef,
      };
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('when the hash key is renamed', () => {
      const endState: CustomDDB.Input = {
        ...baseTableDef,
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
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
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
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('when the sort key is modified', () => {
      const endState: CustomDDB.Input = {
        ...baseTableDef,
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
          {
            attributeName: 'newKey2',
            attributeType: 'S',
          },
        ],
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            keySchema: [
              {
                attributeName: 'newKey',
                keyType: 'HASH',
              },
              {
                attributeName: 'newKey2',
                keyType: 'RANGE',
              },
            ],
            projection: {
              projectionType: 'ALL',
            },
          },
        ],
      };
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('when projection type is modified', () => {
      const endState: CustomDDB.Input = {
        ...baseTableDef,
        attributeDefinitions: [
          {
            attributeName: 'pk',
            attributeType: 'S',
          },
          {
            attributeName: 'sk',
            attributeType: 'S',
          },
        ],
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            keySchema: [
              {
                attributeName: 'sk',
                keyType: 'HASH',
              },
            ],
            projection: {
              projectionType: 'KEYS_ONLY',
            },
          },
        ],
      };
      const nextUpdate = getNextAtomicUpdate(currentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
    it('when non key attributes are modified', () => {
      const modifiedCurrentState: TableDescription = {
        ...currentState,
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
              ProjectionType: 'INCLUDE',
              NonKeyAttributes: ['name'],
            },
            IndexStatus: 'ACTIVE',
          },
        ],
      };
      const endState: CustomDDB.Input = {
        ...baseTableDef,
        attributeDefinitions: [
          {
            attributeName: 'pk',
            attributeType: 'S',
          },
          {
            attributeName: 'sk',
            attributeType: 'S',
          },
        ],
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            keySchema: [
              {
                attributeName: 'sk',
                keyType: 'HASH',
              },
            ],
            projection: {
              projectionType: 'INCLUDE',
              nonKeyAttributes: ['name', 'description'],
            },
          },
        ],
      };
      const nextUpdate = getNextAtomicUpdate(modifiedCurrentState, endState);
      expect(nextUpdate).toMatchSnapshot();
    });
  });
  describe('Extract table definition input from event test', () => {
    it('should extract the correct table definition from event object and parse it into create table input', async () => {
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
      const mockContext = {
        invokedFunctionArn: 'mockInvokedFunctionArn',
      };
      const tableDef = await extractTableInputFromEvent(mockEvent, mockContext);
      expect(tableDef).toMatchSnapshot();
      const createTableInput = toCreateTableInput(tableDef);
      expect(createTableInput).toMatchSnapshot();
    });
    it('should extract the correct old table definition from event object', () => {
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
        },
        OldResourceProperties: {
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
      const tableDef = extractOldTableInputFromEvent(mockEvent);
      expect(tableDef).toMatchSnapshot();
    });
  });
  describe('Non GSI update', () => {
    let currentState: TableDescription;
    let endState: CustomDDB.Input;
    let nextUpdate: UpdateTableCommandInput | undefined;

    const currentStateBase: TableDescription = {
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
    };
    const baseTableDef: CustomDDB.Input = {
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
      ],
      keySchema: [
        {
          attributeName: 'pk',
          keyType: 'HASH',
        },
      ],
      billingMode: 'PAY_PER_REQUEST',
    };
    describe('Get stream update', () => {
      it('should compute the difference correctly when stream is disabled', async () => {
        currentState = {
          ...currentStateBase,
          StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
        };
        endState = baseTableDef;
        nextUpdate = await getStreamUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when stream is enabled', async () => {
        currentState = {
          ...currentStateBase,
        };
        endState = {
          ...baseTableDef,
          streamSpecification: {
            streamViewType: 'NEW_AND_OLD_IMAGES',
          },
        };
        nextUpdate = await getStreamUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();

        currentState = {
          ...currentStateBase,
          StreamSpecification: {
            StreamEnabled: false,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
        };
        nextUpdate = await getStreamUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
    });
    describe('Get time to live update', () => {
      let nextTTLUpdate: UpdateTimeToLiveCommandInput | undefined;
      let currentTTL: TimeToLiveDescription | undefined;
      const currentTTLBase: TimeToLiveDescription = {
        TimeToLiveStatus: 'DISABLED',
      };
      it('should compute the difference correctly when ttl is enabled', () => {
        currentTTL = { ...currentTTLBase };
        endState = {
          ...baseTableDef,
          timeToLiveSpecification: {
            enabled: true,
            attributeName: '_ttl',
          },
        };
        nextTTLUpdate = getTtlUpdate(currentTTL, endState);
        expect(nextTTLUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when ttl is disabled', () => {
        currentTTL = {
          ...currentTTLBase,
          TimeToLiveStatus: 'ENABLED',
          AttributeName: '_ttl',
        };
        endState = {
          ...baseTableDef,
        };
        nextTTLUpdate = getTtlUpdate(currentTTL, endState);
        expect(nextTTLUpdate).toMatchSnapshot();

        endState = {
          ...baseTableDef,
          timeToLiveSpecification: {
            enabled: false,
            attributeName: '_ttl',
          },
        };
        nextTTLUpdate = getTtlUpdate(currentTTL, endState);
        expect(nextTTLUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when attribute is renamed', () => {
        currentTTL = {
          ...currentTTLBase,
          TimeToLiveStatus: 'ENABLED',
          AttributeName: '_ttl',
        };
        endState = {
          ...baseTableDef,
          timeToLiveSpecification: {
            enabled: true,
            attributeName: '_ttl1',
          },
        };
        nextTTLUpdate = getTtlUpdate(currentTTL, endState);
        expect(nextTTLUpdate).toMatchSnapshot();
      });
    });
    describe('Get server side encrytion update', () => {
      it('should compute the difference correctly when SSE is enabled', () => {
        currentState = {
          ...currentStateBase,
        };
        endState = {
          ...baseTableDef,
          sseSpecification: {
            sseEnabled: true,
          },
        };
        nextUpdate = getSseUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when SSE is disabled', () => {
        currentState = {
          ...currentStateBase,
          SSEDescription: {
            Status: 'ENABLED',
          },
        };
        endState = {
          ...baseTableDef,
          sseSpecification: {
            sseEnabled: false,
          },
        };
        nextUpdate = getSseUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();

        endState = {
          ...baseTableDef,
        };
        nextUpdate = getSseUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when SSE type is changed', () => {
        currentState = {
          ...currentStateBase,
          SSEDescription: {
            Status: 'ENABLED',
            SSEType: 'AES256',
          },
        };
        endState = {
          ...baseTableDef,
          sseSpecification: {
            sseEnabled: true,
            sseType: 'KMS',
            kmsMasterKeyId: 'alias/aws/dynamodb/custom',
          },
        };
        nextUpdate = getSseUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
    });
    describe('Get point in time recovery update', () => {
      let nextPITRUpdate: UpdateContinuousBackupsCommandInput | undefined;
      let currentPITR: ContinuousBackupsDescription | undefined;
      const currentPITRBase: ContinuousBackupsDescription = {
        ContinuousBackupsStatus: 'ENABLED',
      };
      it('should compute the difference correctly when PITR is enabled', () => {
        currentPITR = {
          ...currentPITRBase,
          PointInTimeRecoveryDescription: {
            PointInTimeRecoveryStatus: 'DISABLED',
          },
        };
        endState = {
          ...baseTableDef,
          pointInTimeRecoverySpecification: {
            pointInTimeRecoveryEnabled: true,
          },
        };
        nextPITRUpdate = getPointInTimeRecoveryUpdate(currentPITR, endState);
        expect(nextPITRUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when PITR is disabled', () => {
        currentPITR = {
          ...currentPITRBase,
          PointInTimeRecoveryDescription: {
            PointInTimeRecoveryStatus: 'ENABLED',
          },
        };
        endState = {
          ...baseTableDef,
          pointInTimeRecoverySpecification: {
            pointInTimeRecoveryEnabled: false,
          },
        };
        nextPITRUpdate = getPointInTimeRecoveryUpdate(currentPITR, endState);
        expect(nextPITRUpdate).toMatchSnapshot();

        endState = {
          ...baseTableDef,
        };
        nextPITRUpdate = getPointInTimeRecoveryUpdate(currentPITR, endState);
        expect(nextPITRUpdate).toMatchSnapshot();
      });
    });
    describe('Get deletion protection update', () => {
      it('should compute the difference correctly when deletion protection is enabled', () => {
        currentState = {
          ...currentStateBase,
        };
        endState = {
          ...baseTableDef,
          deletionProtectionEnabled: true,
        };
        nextUpdate = getDeletionProtectionUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when deletion protection is disabled', () => {
        currentState = {
          ...currentStateBase,
          DeletionProtectionEnabled: true,
        };
        endState = {
          ...baseTableDef,
          deletionProtectionEnabled: false,
        };
        nextUpdate = getDeletionProtectionUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();

        endState = {
          ...baseTableDef,
        };
        nextUpdate = getDeletionProtectionUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
    });
    describe('Get billing mode update', () => {
      it('should compute the difference correctly when billingMode is changed to "PROVISIONED"', () => {
        currentState = {
          ...currentStateBase,
          BillingModeSummary: {
            BillingMode: 'PAY_PER_REQUEST',
          },
        };
        endState = {
          ...baseTableDef,
          billingMode: 'PROVISIONED',
          provisionedThroughput: {
            readCapacityUnits: 5,
            writeCapacityUnits: 5,
          },
        };
        nextUpdate = getNextAtomicUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when billingMode is changed to "PROVISIONED" and GSIs exist in current table', () => {
        currentState = {
          ...currentStateBase,
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
              AttributeName: 'name',
              AttributeType: 'S',
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
                  AttributeName: 'name',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
            },
          ],
        };
        endState = {
          ...baseTableDef,
          billingMode: 'PROVISIONED',
          provisionedThroughput: {
            readCapacityUnits: 5,
            writeCapacityUnits: 5,
          },
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
              attributeName: 'name',
              attributeType: 'S',
            },
          ],
          globalSecondaryIndexes: [
            {
              indexName: 'gsi1',
              keySchema: [
                {
                  attributeName: 'name',
                  keyType: 'HASH',
                },
              ],
              projection: {
                projectionType: 'ALL',
              },
              provisionedThroughput: {
                readCapacityUnits: 4,
                writeCapacityUnits: 4,
              },
            },
          ],
        };
        nextUpdate = getNextAtomicUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();

        // Second Update
        currentState = {
          ...currentStateBase,
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
              AttributeName: 'name',
              AttributeType: 'S',
            },
          ],
          BillingModeSummary: {
            BillingMode: 'PROVISIONED',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
          GlobalSecondaryIndexes: [
            {
              IndexName: 'gsi1',
              KeySchema: [
                {
                  AttributeName: 'name',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            },
          ],
        };
        nextUpdate = getNextAtomicUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should compute the difference correctly when billingMode is changed to "PAY_PER_REQUEST"', () => {
        currentState = {
          ...currentStateBase,
          BillingModeSummary: {
            BillingMode: 'PROVISIONED',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        };
        endState = {
          ...baseTableDef,
          billingMode: 'PAY_PER_REQUEST',
        };
        nextUpdate = getNextAtomicUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
      it('should assign the table provision throughput when billingMode is "PROVISIONED" and no throughput defined in the new GSI', () => {
        currentState = {
          ...currentStateBase,
          BillingModeSummary: {
            BillingMode: 'PROVISIONED',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        };
        endState = {
          ...baseTableDef,
          billingMode: 'PROVISIONED',
          provisionedThroughput: {
            readCapacityUnits: 5,
            writeCapacityUnits: 5,
          },
          globalSecondaryIndexes: [
            {
              indexName: 'bySk',
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
          ],
        };
        nextUpdate = getNextAtomicUpdate(currentState, endState);
        expect(nextUpdate).toMatchSnapshot();
      });
    });
  });
  describe('isTtlModified', () => {
    it('return false if two ttl are undefined', () => {
      expect(isTtlModified(undefined, undefined)).toBe(false);
    });
    it('return false if two ttl are same', () => {
      const oldTtl = {
        enabled: true,
        attributeName: '_ttl',
      };
      const newTtl = {
        enabled: true,
        attributeName: '_ttl',
      };
      expect(isTtlModified(oldTtl, newTtl)).toBe(false);
    });
    it('return true if one of the ttl is undefined', () => {
      const newTtl = {
        enabled: true,
        attributeName: '_ttl',
      };
      expect(isTtlModified(undefined, newTtl)).toBe(true);
    });
    it('return true if ttl switch is different', () => {
      const oldTtl = {
        enabled: true,
        attributeName: '_ttl',
      };
      const newTtl = {
        enabled: false,
        attributeName: '_ttl',
      };
      expect(isTtlModified(oldTtl, newTtl)).toBe(true);
    });
    it('return true if ttl attribute name is different', () => {
      const oldTtl = {
        enabled: true,
        attributeName: '_ttl',
      };
      const newTtl = {
        enabled: true,
        attributeName: '_ttl2',
      };
      expect(isTtlModified(oldTtl, newTtl)).toBe(true);
    });
  });
  describe('processIsComplete', () => {
    const createEvent = {
      RequestType: 'Create',
      ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      ResponseURL: '[redacted]',
      StackId: 'mockStackId',
      RequestId: 'mockRequestId',
      LogicalResourceId: 'ResourceTable',
      ResourceType: 'Custom::AmplifyDynamoDBTable',
      ResourceProperties: {
        tableName: 'mockTable',
        ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      },
      PhysicalResourceId: 'mockTable',
      Data: {
        TableArn: 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable',
        TableStreamArn: 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable/stream/2025-03-05T01:11:03.258',
        TableName: 'mockTable',
      },
    } as const;

    const updateEvent = {
      RequestType: 'Update',
      ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      ResponseURL: '[redacted]',
      StackId: 'mockStackId',
      RequestId: 'mockRequestId',
      LogicalResourceId: 'ResourceTable',
      ResourceType: 'Custom::AmplifyDynamoDBTable',
      ResourceProperties: {
        tableName: 'mockTable',
        ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      },
      PhysicalResourceId: 'mockTable',
      Data: {
        TableArn: 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable',
        TableStreamArn: 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable/stream/2025-03-05T01:11:03.258',
        TableName: 'mockTable',
        IsTableReplaced: true,
      },
    } as const;

    const deleteEvent = {
      RequestType: 'Delete',
      ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      ResponseURL: '[redacted]',
      StackId: 'mockStackId',
      RequestId: 'mockRequestId',
      LogicalResourceId: 'ResourceTable',
      ResourceType: 'Custom::AmplifyDynamoDBTable',
      ResourceProperties: {
        tableName: 'mockTable',
        ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      },
      PhysicalResourceId: 'mockTable',
      Data: {
        TableArn: 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable',
        TableStreamArn: 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable/stream/2025-03-05T01:11:03.258',
        TableName: 'mockTable',
      },
    } as const;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return IsComplete false when thrown ContinuousBackupsUnavailableException if requestType is `Create` with PITR enabled', async () => {
      mockDescribeTable.mockResolvedValueOnce({
        Table: {
          TableStatus: 'ACTIVE',
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'DISABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        },
      });
      mockDescribeContinuousBackups.mockResolvedValueOnce({
        ContinuousBackupsDescription: {
          ContinuousBackupsStatus: 'DISABLED',
          PointInTimeRecoveryDescription: {
            PointInTimeRecoveryStatus: 'DISABLED',
          },
        },
      });
      mockUpdateContinuousBackups.mockRejectedValueOnce(
        new ContinuousBackupsUnavailableException({
          message: 'Backups are being enabled for the table: mockTable. Please retry later',
          $metadata: {},
        }),
      );
      const { IsComplete } = await processIsComplete(createEvent, {
        invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      });
      expect(IsComplete).toBe(false);
    });
    it('should throw error when thrown it other than ContinuousBackupsUnavailableException if requestType is `Create` with PITR enabled', async () => {
      mockDescribeTable.mockResolvedValueOnce({
        Table: {
          TableStatus: 'ACTIVE',
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'DISABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        },
      });
      mockDescribeContinuousBackups.mockResolvedValueOnce({
        ContinuousBackupsDescription: {
          ContinuousBackupsStatus: 'DISABLED',
          PointInTimeRecoveryDescription: {
            PointInTimeRecoveryStatus: 'DISABLED',
          },
        },
      });
      mockUpdateContinuousBackups.mockRejectedValueOnce(
        new InternalServerError({
          message: 'internal server error',
          $metadata: {},
        }),
      );
      await expect(
        processIsComplete(createEvent, {
          invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
        }),
      ).rejects.toThrow(InternalServerError);
    });
    it('should return IsComplete false when not thrown error if requestType is `Create` with PITR enabled', async () => {
      mockDescribeTable.mockResolvedValueOnce({
        Table: {
          TableStatus: 'ACTIVE',
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'DISABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        },
      });
      mockDescribeContinuousBackups.mockResolvedValueOnce({
        ContinuousBackupsDescription: {
          ContinuousBackupsStatus: 'DISABLED',
          PointInTimeRecoveryDescription: {
            PointInTimeRecoveryStatus: 'DISABLED',
          },
        },
      });
      const { IsComplete } = await processIsComplete(createEvent, {
        invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      });
      expect(IsComplete).toBe(false);
    });
    it('should return IsComplete false when thrown ContinuousBackupsUnavailableException if replace table with PITR enabling', async () => {
      mockDescribeTable.mockResolvedValueOnce({
        Table: {
          TableStatus: 'ACTIVE',
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'DISABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        },
      });
      mockDescribeContinuousBackups.mockResolvedValueOnce({
        ContinuousBackupsDescription: {
          ContinuousBackupsStatus: 'DISABLED',
          PointInTimeRecoveryDescription: {
            PointInTimeRecoveryStatus: 'DISABLED',
          },
        },
      });
      mockUpdateContinuousBackups.mockRejectedValueOnce(
        new ContinuousBackupsUnavailableException({
          message: 'Backups are being enabled for the table: mockTable. Please retry later',
          $metadata: {},
        }),
      );
      const { IsComplete } = await processIsComplete(updateEvent, {
        invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      });
      expect(IsComplete).toBe(false);
    });
    it('should return IsComplete false when table is not acitve', async () => {
      mockDescribeTable.mockResolvedValueOnce({
        Table: {
          TableStatus: 'CREATING',
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'DISABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        },
      });
      const { IsComplete } = await processIsComplete(createEvent, {
        invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      });
      expect(IsComplete).toBe(false);
    });
    it('should return IsComplete true if requestType is `Delete`', async () => {
      const { IsComplete } = await processIsComplete(deleteEvent, {
        invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkisComplete',
      });
      expect(IsComplete).toBe(true);
    });
  });

  describe('processOnEvent', () => {
    describe('Update request with stream update', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return updated TableStreamArn when stream is updated', async () => {
        const oldStreamArn = 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable/stream/2025-03-05T01:11:03.258';
        const newStreamArn = 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable/stream/2025-03-06T02:22:04.369';
        const tableArn = 'arn:aws:dynamodb:ap-northeast-1:123456789100:table/mockTable';

        const activeTableResponse = {
          Table: {
            TableName: 'mockTable',
            TableArn: tableArn,
            TableStatus: 'ACTIVE',
            KeySchema: [
              {
                AttributeName: 'pk',
                KeyType: 'HASH',
              },
            ],
            AttributeDefinitions: [
              {
                AttributeName: 'pk',
                AttributeType: 'S',
              },
            ],
            BillingModeSummary: {
              BillingMode: 'PAY_PER_REQUEST',
            },
          },
        };

        const updateEvent: AWSCDKAsyncCustomResource.OnEventRequest = {
          RequestType: 'Update',
          ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
          ResponseURL: '[redacted]',
          StackId: 'mockStackId',
          RequestId: 'mockRequestId',
          LogicalResourceId: 'ResourceTable',
          ResourceType: 'Custom::AmplifyDynamoDBTable',
          PhysicalResourceId: 'mockTable',
          ResourceProperties: {
            tableName: 'mockTable',
            ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
            attributeDefinitions: [
              {
                attributeName: 'pk',
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
            streamSpecification: {
              streamEnabled: true,
              streamViewType: 'NEW_IMAGE',
            },
          },
          OldResourceProperties: {
            tableName: 'mockTable',
            ServiceToken: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
            attributeDefinitions: [
              {
                attributeName: 'pk',
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
            streamSpecification: {
              streamEnabled: true,
              streamViewType: 'NEW_AND_OLD_IMAGES',
            },
          },
        };

        const mockContext = {
          invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
        };

        // Mock ListTagsOfResourceCommand (used by getTableTags)
        mockSend.mockResolvedValue({
          Tags: [
            { Key: 'key1', Value: 'value1' },
            { Key: 'key2', Value: 'value2' },
            { Key: 'key3', Value: 'value3' },
          ],
        });

        // First describeTable call - returns current state with old stream
        mockDescribeTable.mockResolvedValueOnce({
          Table: {
            ...activeTableResponse.Table,
            StreamSpecification: {
              StreamEnabled: true,
              StreamViewType: 'NEW_AND_OLD_IMAGES',
            },
            LatestStreamArn: oldStreamArn,
          },
        });

        // Mock describeContinuousBackups
        mockDescribeContinuousBackups.mockResolvedValue({
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'ENABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        });

        // Mock tagResource/untagResource (no tag changes)
        mockTagResource.mockResolvedValue({});
        mockUntagResource.mockResolvedValue({});

        // Mock updateTable for stream update
        mockUpdateTable.mockResolvedValue({});

        // Mock describeTable calls for isTableReady checks after stream update
        // These will be called by retry() after updateTable
        mockDescribeTable.mockResolvedValue({
          Table: {
            ...activeTableResponse.Table,
            StreamSpecification: {
              StreamEnabled: true,
              StreamViewType: 'NEW_IMAGE',
            },
            LatestStreamArn: newStreamArn,
          },
        });

        const result = await processOnEvent(updateEvent, mockContext);

        // Verify that TableStreamArn in the result matches the new stream ARN
        expect(result.Data?.TableStreamArn).toBe(newStreamArn);
        expect(result.Data?.TableArn).toBe(tableArn);
        expect(result.Data?.TableName).toBe('mockTable');
        expect(result.PhysicalResourceId).toBe('mockTable');

        // Verify describeTable was called multiple times (initial + retry + final)
        expect(mockDescribeTable).toHaveBeenCalledWith({ TableName: 'mockTable' });

        // Verify updateTable was called for stream update
        expect(mockUpdateTable).toHaveBeenCalledWith({
          TableName: 'mockTable',
          StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_IMAGE',
          },
        });
      });

      it('should not update stream when there is no stream change', async () => {
        const existingStreamArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/mockTable/stream/2024-01-01T00:00:00.000';
        const tableArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/mockTable';

        const activeTableResponse = {
          Table: {
            TableName: 'mockTable',
            TableArn: tableArn,
            TableStatus: 'ACTIVE',
            KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
            BillingModeSummary: { BillingMode: 'PAY_PER_REQUEST' },
            StreamSpecification: {
              StreamEnabled: true,
              StreamViewType: 'NEW_AND_OLD_IMAGES',
            },
            LatestStreamArn: existingStreamArn,
          },
        };

        const updateEvent: AWSCDKAsyncCustomResource.OnEventRequest = {
          RequestType: 'Update',
          ServiceToken: 'test-token',
          ResponseURL: 'test-url',
          StackId: 'test-stack',
          RequestId: 'test-request',
          LogicalResourceId: 'test-resource',
          PhysicalResourceId: 'mockTable',
          ResourceType: 'Custom::AmplifyDynamoDBTable',
          ResourceProperties: {
            ServiceToken: 'test-token',
            tableName: 'mockTable',
            attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
            keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
            billingMode: 'PAY_PER_REQUEST',
            streamSpecification: {
              streamEnabled: true,
              streamViewType: 'NEW_AND_OLD_IMAGES',
            },
          },
          OldResourceProperties: {
            ServiceToken: 'test-token',
            tableName: 'mockTable',
            attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
            keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
            billingMode: 'PAY_PER_REQUEST',
            streamSpecification: {
              streamEnabled: true,
              streamViewType: 'NEW_AND_OLD_IMAGES',
            },
          },
        };

        const mockContext = {
          invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        };

        // Mock initial describeTable
        mockDescribeTable.mockResolvedValue(activeTableResponse);

        // Mock describeContinuousBackups (no PITR change)
        mockDescribeContinuousBackups.mockResolvedValue({
          ContinuousBackupsDescription: {
            ContinuousBackupsStatus: 'ENABLED',
            PointInTimeRecoveryDescription: {
              PointInTimeRecoveryStatus: 'DISABLED',
            },
          },
        });

        // Mock ListTagsOfResourceCommand (used by getTableTags)
        mockSend.mockResolvedValue({
          Tags: [
            { Key: 'key1', Value: 'value1' },
            { Key: 'key2', Value: 'value2' },
            { Key: 'key3', Value: 'value3' },
          ],
        });

        // Mock tagResource for adding tags
        mockTagResource.mockResolvedValue({});
        mockUntagResource.mockResolvedValue({});

        const result = await processOnEvent(updateEvent, mockContext);

        // Verify that TableStreamArn remains unchanged
        expect(result.Data?.TableStreamArn).toBe(existingStreamArn);
        expect(result.Data?.TableArn).toBe(tableArn);
        expect(result.Data?.TableName).toBe('mockTable');
        expect(result.PhysicalResourceId).toBe('mockTable');

        // Verify updateTable was NOT called for stream update (no stream change)
        expect(mockUpdateTable).not.toHaveBeenCalled();
      });
    });
  });
});
