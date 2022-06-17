/* eslint-disable @typescript-eslint/explicit-function-return-type, no-console */
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Retrieve the item count from the underlying data table.
 */
const queryItemCount = async ({
  year, letter1, letter2, LastKey,
}) => {
  let count = 0;

  const data = await docClient.query({
    TableName: process.env.MOVIES_TABLE_NAME,
    KeyConditionExpression: '#yr = :yyyy AND title between :letter1 and :letter2',
    ExpressionAttributeNames: { '#yr': 'year' },
    ExpressionAttributeValues: {
      ':yyyy': year,
      ':letter1': letter1,
      ':letter2': letter2,
    },
    Select: 'COUNT',
    ...((LastKey !== 'undefined') ? { ExclusiveStartKey: LastKey } : {}),
  }).promise();

  count += data.Count ?? 0;

  if (typeof data.LastEvaluatedKey !== 'undefined') {
    count += queryItemCount({
      year, letter1, letter2, LastKey: data.LastEvaluatedKey,
    });
  }

  return count;
};

/**
 * Write an updated aggregate record into the Aggregates table
 */
const updateAggregate = async (model, queryExpression, count) => {
  const params = {
    TableName: process.env.AGGREGATES_TABLE_NAME,
    Item: {
      model,
      queryExpression,
      count,
    },
  };

  console.log(params);
  return docClient.put(params).promise();
};

/**
 * Entry point to the lambda function.
 */
exports.handler = async event => {
  console.log(event);

  const { model, queryExpression, args } = event;

  // Notes from Manuel on the sync latency:
  // Can we move the below code to another Lambda that we "fire and forget" then immediately return the response?
  // Can you do Async Lambda with HTTP resolvers?

  // TODO: These need to be converted to use data which is parsed from the inserted record perhaps?
  const updatedCount = await queryItemCount({
    year: args.year, letter1: args.letter1, letter2: args.letter2,
  });
  console.log(updatedCount);
  const result = await updateAggregate(model, queryExpression, updatedCount);
  return result;
};
