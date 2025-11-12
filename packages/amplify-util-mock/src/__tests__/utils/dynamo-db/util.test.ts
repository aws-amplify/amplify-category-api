import {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  UpdateTableCommand,
  KeyType,
  ScalarAttributeType,
  ProjectionType,
  DescribeTableOutput,
  CreateTableInput,
  UpdateTableInput,
  UpdateTableOutput,
  TableDescription,
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import * as ddbUtils from '../../../utils/dynamo-db/utils';
import { waitTillTableStateIsActive } from '../../../utils/dynamo-db/helpers';

jest.mock('../../../utils/dynamo-db/helpers');

describe('DynamoDB Utils', () => {
  const ddbMock = mockClient(DynamoDBClient);

  beforeEach(() => {
    jest.resetAllMocks();
    ddbMock.reset();
  });

  describe('describeTables', () => {
    it('should call call DynamoDB Clients describe table and collect the results', async () => {
      const tableNames = ['table1', 'table2'];
      const describeTableResult: Record<string, DescribeTableOutput> = {
        table1: {
          Table: {
            TableName: 'table1',
            KeySchema: [
              {
                AttributeName: 'id',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE',
              },
            ],
            GlobalSecondaryIndexes: [
              {
                IndexName: 'index1',
                Projection: {
                  ProjectionType: 'ALL',
                },
              },
            ],
          },
        },
        table2: {
          Table: {
            TableName: 'table2',
            KeySchema: [
              {
                AttributeName: 'table2_id',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE',
              },
            ],
            GlobalSecondaryIndexes: [
              {
                IndexName: 'index2',
                Projection: {
                  ProjectionType: 'ALL',
                },
              },
            ],
          },
        },
      };

      ddbMock.on(DescribeTableCommand, { TableName: 'table1' }).resolves(describeTableResult.table1);
      ddbMock.on(DescribeTableCommand, { TableName: 'table2' }).resolves(describeTableResult.table2);

      const client = new DynamoDBClient({});
      await expect(ddbUtils.describeTables(client, tableNames)).resolves.toEqual({
        table1: describeTableResult.table1.Table,
        table2: describeTableResult.table2.Table,
      });

      expect(ddbMock).toHaveReceivedCommandTimes(DescribeTableCommand, 2);
      expect(ddbMock).toHaveReceivedCommandWith(DescribeTableCommand, { TableName: 'table1' });
      expect(ddbMock).toHaveReceivedCommandWith(DescribeTableCommand, { TableName: 'table2' });
    });
  });

  describe('createTables', () => {
    it('should call createTable for each table', async () => {
      ddbMock.on(CreateTableCommand).resolves({});

      const tableInputs: CreateTableInput[] = [
        {
          TableName: 'table1',
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH',
            },
          ],
        },
        {
          TableName: 'table2',
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH',
            },
          ],
        },
      ];
      const client = new DynamoDBClient({});
      await ddbUtils.createTables(client, tableInputs);

      expect(ddbMock).toHaveReceivedCommandTimes(CreateTableCommand, 2);
      expect(ddbMock).toHaveReceivedCommandWith(CreateTableCommand, tableInputs[0]);
      expect(ddbMock).toHaveReceivedCommandWith(CreateTableCommand, tableInputs[1]);
    });
  });

  describe('updateTables', () => {
    it('should wait for table to be in ACTIVE state before updating', async () => {
      const waitTillTableStateIsActiveMock = (waitTillTableStateIsActive as jest.Mock).mockResolvedValue(undefined);

      ddbMock.on(UpdateTableCommand).callsFake((input: UpdateTableInput) => {
        const response: UpdateTableOutput = {
          TableDescription: {
            TableName: input.TableName,
            AttributeDefinitions: input.AttributeDefinitions,
            GlobalSecondaryIndexes: input.GlobalSecondaryIndexUpdates?.filter((update) => update.Create).map((gsi) => gsi.Create),
          },
        };
        return response;
      });

      const tables: UpdateTableInput[] = [
        {
          TableName: 'table1',
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
          ],
          GlobalSecondaryIndexUpdates: [
            {
              Create: {
                IndexName: 'idx1',
                KeySchema: [
                  {
                    AttributeName: 'id',
                    KeyType: 'HASH',
                  },
                ],
                Projection: { ProjectionType: 'ALL' },
              },
            },
          ],
        },
        {
          TableName: 'table1',
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
            {
              AttributeName: 'createdAt',
              AttributeType: 'S',
            },
          ],
          GlobalSecondaryIndexUpdates: [
            {
              Create: {
                IndexName: 'byCreatedDate',
                KeySchema: [
                  {
                    AttributeName: 'id',
                    KeyType: 'HASH',
                  },
                  {
                    AttributeName: 'createdAt',
                    KeyType: 'RANGE',
                  },
                ],
                Projection: { ProjectionType: 'ALL' },
              },
            },
          ],
        },
      ];
      const client = new DynamoDBClient({});
      const updatePromise = ddbUtils.updateTables(client, tables);
      await updatePromise;

      expect(ddbMock).toHaveReceivedCommandTimes(UpdateTableCommand, 2);
      expect(ddbMock).toHaveReceivedCommandWith(UpdateTableCommand, tables[0]);
      expect(ddbMock).toHaveReceivedCommandWith(UpdateTableCommand, tables[1]);

      expect(waitTillTableStateIsActiveMock).toHaveBeenCalledTimes(2);
      expect(waitTillTableStateIsActiveMock).toHaveBeenNthCalledWith(1, client, tables[0].TableName);
      expect(waitTillTableStateIsActiveMock).toHaveBeenNthCalledWith(2, client, tables[1].TableName);
    });
  });

  describe('getUpdateTableInput', () => {
    const baseSchema = {
      TableName: 'table1',
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: ScalarAttributeType.S,
        },
        {
          AttributeName: 'Name',
          AttributeType: ScalarAttributeType.S,
        },
        {
          AttributeName: 'Address',
          AttributeType: ScalarAttributeType.S,
        },
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: KeyType.HASH,
        },
      ],
    };
    const existingIndex = {
      IndexName: 'existingIndex',
      KeySchema: [
        {
          AttributeName: 'address',
          KeyType: KeyType.HASH,
        },
      ],
      Projection: {
        ProjectionType: ProjectionType.ALL,
      },
    };
    const newIndex = {
      IndexName: 'newIndex1',
      KeySchema: [
        {
          AttributeName: 'name',
          KeyType: KeyType.HASH,
        },
      ],
      Projection: {
        ProjectionType: ProjectionType.ALL,
      },
    };
    it('should add a new index', () => {
      const createTableInput: CreateTableInput = {
        ...baseSchema,
        GlobalSecondaryIndexes: [newIndex, existingIndex],
      };
      const existingTableConfig: TableDescription = {
        ...baseSchema,
        GlobalSecondaryIndexes: [existingIndex],
      };

      const updateInput = ddbUtils.getUpdateTableInput(createTableInput, existingTableConfig);
      expect(updateInput).toHaveLength(1);
      expect(updateInput[0].TableName).toEqual(baseSchema.TableName);
      expect(updateInput[0].AttributeDefinitions).toEqual(baseSchema.AttributeDefinitions);
      expect(updateInput[0].GlobalSecondaryIndexUpdates).toEqual([
        {
          Create: newIndex,
        },
      ]);
    });
    it('should delete a new index', () => {
      const createTableInput: CreateTableInput = {
        ...baseSchema,
      };
      const existingTableConfig: TableDescription = {
        ...baseSchema,
        GlobalSecondaryIndexes: [existingIndex],
      };
      const updateInput = ddbUtils.getUpdateTableInput(createTableInput, existingTableConfig);
      expect(updateInput[0].GlobalSecondaryIndexUpdates).toEqual([
        {
          Delete: { IndexName: existingIndex.IndexName },
        },
      ]);
    });

    it('should throw error if the table names dont match', () => {
      const createTableInput: CreateTableInput = {
        ...baseSchema,
        TableName: 'different-name',
      };
      const existingTableConfig: TableDescription = {
        ...baseSchema,
        GlobalSecondaryIndexes: [existingIndex],
      };
      expect(() => ddbUtils.getUpdateTableInput(createTableInput, existingTableConfig)).toThrow('Invalid input, table name mismatch');
    });

    it('should generate sepearate inputs when there is an addition and deletion of index', () => {
      const createTableInput: CreateTableInput = {
        ...baseSchema,
        GlobalSecondaryIndexes: [newIndex],
      };
      const existingTableConfig: TableDescription = {
        ...baseSchema,
        GlobalSecondaryIndexes: [existingIndex],
      };
      const updateInput = ddbUtils.getUpdateTableInput(createTableInput, existingTableConfig);
      expect(updateInput).toHaveLength(2);
      expect(updateInput[0].GlobalSecondaryIndexUpdates).toEqual([
        {
          Delete: { IndexName: existingIndex.IndexName },
        },
      ]);

      expect(updateInput[1].GlobalSecondaryIndexUpdates).toEqual([
        {
          Create: newIndex,
        },
      ]);
    });
  });
});
