import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const MILLI_SECONDS = 1000;
export async function waitTillTableStateIsActive(
  dynamoDBClient: DynamoDBClient,
  tableName: string,
  maximumWait: number = 15 * MILLI_SECONDS,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let intervalHandle;
    let timeoutHandle;
    const checkStatus = async () => {
      const tableDescription = await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
      if (tableDescription.Table.TableStatus === 'ACTIVE') {
        clearTimeout(timeoutHandle);
        clearInterval(intervalHandle);
        resolve();
      }
    };
    intervalHandle = setInterval(checkStatus, 1000);
    timeoutHandle = setTimeout(() => {
      clearTimeout(timeoutHandle);
      clearInterval(intervalHandle);
      reject(new Error('Waiting for table status to turn ACTIVE timed out'));
    }, maximumWait);

    await checkStatus();
  });
}
