const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const DDB = new DynamoDBClient();

exports.handler = async (event, context) => {
  return await DDB.send(new ScanCommand({ TableName: event.tableName }));
};
