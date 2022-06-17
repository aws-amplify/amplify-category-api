/* eslint-disable @typescript-eslint/explicit-function-return-type, no-console */
/**
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This file is licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
*/
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

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
    count += await queryItemCount({
      year, letter1, letter2, LastKey: data.LastEvaluatedKey,
    });
  }

  return count;
};

/**
 * Entry point to the lambda function.
 */
exports.handler = async event => {
  console.log(event);

  const { year, letter1, letter2 } = event;
  if (!year) { throw new Error('Expected year to be provided in input'); }
  if (!letter1) { throw new Error('Expected letter1 to be provided in input'); }
  if (!letter2) { throw new Error('Expected letter2 to be provided in input'); }

  const count = await queryItemCount({ year, letter1, letter2 });
  console.log(`Got count ${count} for input: { year: ${year}, letter1: ${letter1}, letter2: ${letter2} }`);
  return { count };
};
