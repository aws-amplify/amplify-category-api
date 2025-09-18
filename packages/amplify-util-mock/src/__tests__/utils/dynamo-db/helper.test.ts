import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { waitTillTableStateIsActive } from '../../../utils/dynamo-db/helpers';

describe('waitTillTableStateIsActive', () => {
  const ddbMock = mockClient(DynamoDBClient);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    ddbMock.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should wait for table to be in active state', async () => {
    ddbMock.on(DescribeTableCommand).resolves({
      Table: {
        TableName: 'table1',
        TableStatus: 'ACTIVE',
      },
    });

    const dynamoDBClient = new DynamoDBClient({});
    const waitTillTableStateIsActivePromise = waitTillTableStateIsActive(dynamoDBClient, 'table1');
    jest.advanceTimersByTime(1000);
    await waitTillTableStateIsActivePromise;

    expect(ddbMock.commandCalls(DescribeTableCommand)[0].args[0].input).toEqual({ TableName: 'table1' });
  });

  it('should reject the promise when table does not become active for timeout period', async () => {
    ddbMock.on(DescribeTableCommand).resolves({
      Table: {
        TableName: 'table1',
        TableStatus: 'UPDATING',
      },
    });

    const dynamoDBClient = new DynamoDBClient({});
    const waitTillTableStateIsActivePromise = waitTillTableStateIsActive(dynamoDBClient, 'table1');
    jest.runOnlyPendingTimers();
    await expect(waitTillTableStateIsActivePromise).rejects.toMatchObject({ message: 'Waiting for table status to turn ACTIVE timed out' });
    expect(ddbMock.commandCalls(DescribeTableCommand).length).toBeGreaterThan(0);
  });

  it('should periodically call check status', async () => {
    let callCount = 0;
    ddbMock.on(DescribeTableCommand).callsFake(() => {
      callCount += 1;
      return {
        Table: {
          TableName: 'table1',
          TableStatus: callCount === 3 ? 'ACTIVE' : 'UPDATING',
        },
      };
    });

    const dynamoDBClient = new DynamoDBClient({});
    const waitTillTableStateIsActivePromise = waitTillTableStateIsActive(dynamoDBClient, 'table1');
    jest.advanceTimersByTime(3000);
    await waitTillTableStateIsActivePromise;

    const calls = ddbMock.commandCalls(DescribeTableCommand);
    expect(calls.length).toBe(4);
    expect(calls[0].args[0].input).toEqual({ TableName: 'table1' });
    expect(calls[1].args[0].input).toEqual({ TableName: 'table1' });
    expect(calls[2].args[0].input).toEqual({ TableName: 'table1' });
    expect(calls[3].args[0].input).toEqual({ TableName: 'table1' });
  });
});
