import { DynamoDBClient, ListTablesCommand, CreateTableInput, GlobalSecondaryIndex } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { createTables, describeTables, getUpdateTableInput, updateTables } from '../../../utils/dynamo-db/utils';
import { createAndUpdateTable, MockDynamoDBConfig } from '../../../utils/dynamo-db';

jest.mock('../../../utils/dynamo-db/utils');

describe('createAndUpdateTable', () => {
  const table1Input: CreateTableInput = {
    TableName: 'table1',
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S',
      },
      {
        AttributeName: 'name',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH',
      },
    ],
  };

  const indexByName: GlobalSecondaryIndex = {
    IndexName: 'byName',
    KeySchema: [
      {
        AttributeName: 'name',
        KeyType: 'HASH',
      },
    ],

    Projection: {
      ProjectionType: 'ALL',
    },
  };
  const indexByContent: GlobalSecondaryIndex = {
    IndexName: 'index1',
    KeySchema: [
      {
        AttributeName: 'content',
        KeyType: 'HASH',
      },
    ],

    Projection: {
      ProjectionType: 'ALL',
    },
  };

  const table2Input: CreateTableInput = {
    ...table1Input,
    AttributeDefinitions: [
      ...table1Input.AttributeDefinitions,
      {
        AttributeName: 'content',
        AttributeType: 'S',
      },
    ],
    TableName: 'table2',
    GlobalSecondaryIndexes: [indexByName, indexByContent],
  };

  const ddbMock = mockClient(DynamoDBClient);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    ddbMock.reset();
    ddbMock.on(ListTablesCommand).resolves({ TableNames: [] });
  });

  it('should create new tables when they are missing', async () => {
    const mockDDBConfig: MockDynamoDBConfig = {
      tables: [{ Properties: table1Input }],
    };
    (describeTables as jest.Mock).mockReturnValue({});
    const client = new DynamoDBClient({});
    await createAndUpdateTable(client, mockDDBConfig);
    expect(createTables).toHaveBeenCalledWith(client, [table1Input]);
    expect(getUpdateTableInput).not.toHaveBeenCalled();
    expect(updateTables).toHaveBeenCalledWith(client, []);
  });

  it('should update existing table with new GSI', async () => {
    const mockDDBConfig: MockDynamoDBConfig = {
      tables: [{ Properties: table1Input }, { Properties: table2Input }],
    };

    // Mock that both tables already exist
    ddbMock.on(ListTablesCommand).resolves({ 
      TableNames: [table1Input.TableName, table2Input.TableName] 
    });
    
    (describeTables as jest.Mock).mockReturnValue({
      [table1Input.TableName]: table1Input,
      [table2Input.TableName]: { ...table2Input, GlobalSecondaryIndexes: [] },
    });
    
    const getUpdateTableInputResult = [
      {
        ...table2Input,
        GlobalSecondaryIndexUpdates: [
          {
            Create: table2Input.GlobalSecondaryIndexes[0],
          },
        ],
      },
      {
        ...table2Input,
        GlobalSecondaryIndexUpdates: [
          {
            Create: table2Input.GlobalSecondaryIndexes[1],
          },
        ],
      },
    ];

    (getUpdateTableInput as jest.Mock).mockImplementation((input) => (input === table2Input ? getUpdateTableInputResult : []));

    const client = new DynamoDBClient({});
    await createAndUpdateTable(client, mockDDBConfig);
    expect(createTables).toHaveBeenCalledWith(client, []);
    expect(getUpdateTableInput).toHaveBeenCalledWith(table2Input, { ...table2Input, GlobalSecondaryIndexes: [] });
    expect(updateTables).toHaveBeenCalledWith(client, getUpdateTableInputResult);
  });
});
