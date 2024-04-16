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
} from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as CustomDDB from '../resources/amplify-dynamodb-table/amplify-table-types';
import {
  TableDescription,
  UpdateTableCommandInput,
  UpdateTimeToLiveCommandInput,
  TimeToLiveDescription,
  UpdateContinuousBackupsCommandInput,
  ContinuousBackupsDescription,
} from '@aws-sdk/client-dynamodb';
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
    it('should extract the correct table definition from event object and parse it into create table input', () => {
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
});
