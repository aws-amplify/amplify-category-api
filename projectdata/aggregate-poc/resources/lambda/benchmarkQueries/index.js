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

/**
 * Example query which executes against the HashKey and SortKey for a given table.
 * Only pulls COUNT.
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
    count += await queryItemCount({
      year, letter1, letter2, LastKey: data.LastEvaluatedKey,
    });
  }

  return count;
};

/**
 * Example query which executes against the HashKey and SortKey for a given table.
 * Leverages a FilterExpression to additionally filter beyond the key space.
 * Only pulls COUNT
 */
const queryItemCountWithFilter = async ({
  year, letter1, letter2, minRunningTimeSecs, LastKey,
}) => {
  let count = 0;

  const data = await docClient.query({
    TableName: process.env.MOVIES_TABLE_NAME,
    KeyConditionExpression: '#yr = :yyyy AND title between :letter1 and :letter2',
    FilterExpression: 'info.running_time_secs >= :minRunningTimeSecs',
    ExpressionAttributeNames: { '#yr': 'year' },
    ExpressionAttributeValues: {
      ':yyyy': year,
      ':letter1': letter1,
      ':letter2': letter2,
      ':minRunningTimeSecs': minRunningTimeSecs,
    },
    Select: 'COUNT',
    ...((LastKey !== 'undefined') ? { ExclusiveStartKey: LastKey } : {}),
  }).promise();

  count += data.Count ?? 0;

  if (typeof data.LastEvaluatedKey !== 'undefined') {
    count += await queryItemCountWithFilter({
      year, letter1, letter2, minRunningTimeSecs, LastKey: data.LastEvaluatedKey,
    });
  }

  return count;
};

/**
 * Example query which executes against the HashKey and SortKey for a given table.
 * Leverages a FilterExpression to additionally filter beyond the key space.
 * Pulls COUNT, MIN, MAX, SUM for a fixed field.
 */
const queryItemAggregateMetadata = async ({
  year, letter1, letter2, minRunningTimeSecs, fieldToAggregate, LastKey,
}) => {
  let count = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;

  const queryInput = {
    TableName: process.env.MOVIES_TABLE_NAME,
    KeyConditionExpression: '#yr = :yyyy AND title between :letter1 and :letter2',
    FilterExpression: 'info.running_time_secs >= :minRunningTimeSecs',
    ExpressionAttributeNames: { '#yr': 'year' },
    ExpressionAttributeValues: {
      ':yyyy': year,
      ':letter1': letter1,
      ':letter2': letter2,
      ':minRunningTimeSecs': minRunningTimeSecs,
    },
    ProjectionExpression: fieldToAggregate,
    Select: 'SPECIFIC_ATTRIBUTES',
    ...((LastKey !== 'undefined') ? { ExclusiveStartKey: LastKey } : {}),
  };

  console.debug(`Generated Query: ${JSON.stringify(queryInput)}`);

  const data = await docClient.query(queryInput).promise();

  // TODO: Do this all in one pass.
  // TODO: Parse out the field using `fieldToAggregate`
  const runningTimes = data.Items.map(item => item.info.running_time_secs).filter(runtime => typeof runtime === 'number');
  count += runningTimes.length;
  sum += runningTimes.reduce((previousValue, currentValue) => previousValue + currentValue, 0);
  min = Math.min(min, ...runningTimes);
  max = Math.max(max, ...runningTimes);

  if (typeof data.LastEvaluatedKey !== 'undefined') {
    const recursiveResponse = await queryItemAggregateMetadata({
      year, letter1, letter2, minRunningTimeSecs, fieldToAggregate, LastKey: data.LastEvaluatedKey,
    });
    count += recursiveResponse.count;
    sum += recursiveResponse.sum;
    min = Math.min(min, recursiveResponse.min);
    max = Math.max(max, recursiveResponse.max);
  }

  return {
    count, min, max, sum,
  };
};

// TYPES
// TODO: Support NOT, AND, OR, and NEQ for filterAttributes as well. https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html#Expressions.OperatorsAndFunctions.Syntax
// type ComparisonType = 'EQ' | 'LT' | 'LTE' | 'GT' | 'GTE' | 'BETWEEN' | 'BEGINS_WITH';

// type PartitionKeyComparison = {
//   fieldName: String,
//   comparedValue: Number,
// };

// type Comparison = {
//   fieldName: String,
//   comparisonType: ComparisonType,
//   comparedValue?: Number,
//   rangeStart?: Number,
//   rangeEnd?: Number,
// };

// type QueryProps = {
//   tableName: String,
//   partitionKeyComparison: PartitionKeyComparison,
//   sortKeyComparison?: Comparison,
//   filterComparisons?: Comparison[],
//   aggregateField: String,
//   lastKey: Any,
// };

/**
 * Example query which executes against the HashKey and SortKey for a given table.
 * Leverages a FilterExpression to additionally filter beyond the key space.
 * Genericized Version of the previous implementation
 * Pulls COUNT, MIN, MAX, SUM for a fixed field.
 */
// eslint-disable-next-line max-lines-per-function
const queryItemAggregateMetadataGeneric = async ({
  tableName: TableName,
  partitionKeyComparison,
  sortKeyComparison,
  filterComparisons,
  aggregateField: ProjectionExpression,
  lastKey: LastKey,
}) => {
  let count = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;

  // TODO: This can be simplified into a map and between/all other cases.
  // eslint-disable-next-line max-lines-per-function
  const buildAliasedComparisonExpression = (comparisonAlias, comparison) => {
    const {
      fieldName, comparisonType, comparedValue, rangeStart, rangeEnd,
    } = comparison;
    if (comparisonType === 'BETWEEN') {
      return {
        expressionString: `#${comparisonAlias} BETWEEN :${comparisonAlias}Start AND :${comparisonAlias}End`,
        expressionAttributeName: { [`#${comparisonAlias}`]: fieldName },
        expressionAttributeValues: {
          [`:${comparisonAlias}Start`]: rangeStart,
          [`:${comparisonAlias}End`]: rangeEnd,
        },
      };
    }

    if (comparisonType === 'BEGINS_WITH') {
      return {
        expressionString: `begins_with( #${comparisonAlias}, :${comparisonAlias} )`,
        expressionAttributeName: { [`#${comparisonAlias}`]: fieldName },
        expressionAttributeValues: { [`:${comparisonAlias}`]: comparedValue },
      };
    }

    const comparisonOperator = {
      EQ: '=',
      LT: '<',
      LTE: '<=',
      GT: '>',
      GTE: '>=',
    }[comparisonType];

    if (fieldName.includes('.')) {
      return {
        expressionString: `${fieldName} ${comparisonOperator} :${comparisonAlias}`,
        expressionAttributeName: {},
        expressionAttributeValues: { [`:${comparisonAlias}`]: comparedValue },
      };
    }

    return {
      expressionString: `#${comparisonAlias} ${comparisonOperator} :${comparisonAlias}`,
      expressionAttributeName: { [`#${comparisonAlias}`]: fieldName },
      expressionAttributeValues: { [`:${comparisonAlias}`]: comparedValue },
    };
  };

  const {
    expressionString: pkExpressionString,
    expressionAttributeName: pkExpressionAttributeName,
    expressionAttributeValues: pkExpressionAttributeValues,
  } = buildAliasedComparisonExpression('pk', { ...partitionKeyComparison, comparisonType: 'EQ' });
  let KeyConditionExpression = pkExpressionString;
  let ExpressionAttributeNames = { ...pkExpressionAttributeName };
  let ExpressionAttributeValues = { ...pkExpressionAttributeValues };

  if (sortKeyComparison) {
    const { expressionString, expressionAttributeName, expressionAttributeValues } = buildAliasedComparisonExpression('sk', sortKeyComparison);
    KeyConditionExpression = KeyConditionExpression.concat(` AND ${expressionString}`);
    ExpressionAttributeNames = { ...ExpressionAttributeNames, ...expressionAttributeName };
    ExpressionAttributeValues = { ...ExpressionAttributeValues, ...expressionAttributeValues };
  }

  let FilterExpression = null;
  if (filterComparisons) {
    FilterExpression = '';
    filterComparisons.forEach((filterComparison, i) => {
      const { expressionString, expressionAttributeName, expressionAttributeValues } = buildAliasedComparisonExpression(`filter${i}`, filterComparison);
      if (FilterExpression === '') {
        FilterExpression = expressionString;
      } else {
        FilterExpression = FilterExpression.concat(` AND ${expressionString}`);
      }
      ExpressionAttributeNames = { ...ExpressionAttributeNames, ...expressionAttributeName };
      ExpressionAttributeValues = { ...ExpressionAttributeValues, ...expressionAttributeValues };
    });
  }

  const queryInput = {
    TableName,
    KeyConditionExpression,
    FilterExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ProjectionExpression,
    Select: 'SPECIFIC_ATTRIBUTES',
    ...((LastKey !== 'undefined') ? { ExclusiveStartKey: LastKey } : {}),
  };

  console.debug(`Generated Query: ${JSON.stringify(queryInput)}`);

  const data = await docClient.query(queryInput).promise();

  // TODO: Support [] index based access https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Attributes.html#Expressions.Attributes.NestedElements.DocumentPathExamples
  const accessByDocumentPath = (item, path) => {
    const pathParts = path.split('.');
    let currentValue = item;
    pathParts.forEach(pathPart => {
      currentValue = currentValue[pathPart];
    });
    return currentValue;
  };

  // TODO: Do this all in one pass.
  const aggregateValues = data.Items
    .map(item => accessByDocumentPath(item, ProjectionExpression))
    .filter(runtime => typeof runtime === 'number');
  count += aggregateValues.length;
  sum += aggregateValues.reduce((previousValue, currentValue) => previousValue + currentValue, 0);
  min = Math.min(min, ...aggregateValues);
  max = Math.max(max, ...aggregateValues);

  if (typeof data.LastEvaluatedKey !== 'undefined') {
    const recursiveResponse = await queryItemAggregateMetadata({
      tableName: TableName,
      partitionKeyComparison,
      sortKeyComparison,
      filterComparisons,
      aggregateField: ProjectionExpression,
      lastKey: data.LastEvaluatedKey,
    });
    count += recursiveResponse.count;
    sum += recursiveResponse.sum;
    min = Math.min(min, recursiveResponse.min);
    max = Math.max(max, recursiveResponse.max);
  }

  return {
    count, min, max, sum, average: sum / count,
  };
};

const validateExpectedInputs = nameValPairs => {
  nameValPairs.forEach(([name, val]) => {
    if (!val) { throw new Error(`Expected ${name} to be provided in input`); }
  });
};

/**
 * Entry point to the lambda function.
 */
// eslint-disable-next-line max-lines-per-function
exports.handler = async event => {
  console.debug(event);

  const { benchmarkType } = event;

  if (!benchmarkType) { throw new Error('Expected benchmarkType to be provided in input as either queryItemCount, queryItemCountWithFilter, queryItemAggregateMetadata, or queryItemAggregateMetadataGeneric'); }

  if (benchmarkType === 'queryItemCount') {
    const { year, letter1, letter2 } = event;
    validateExpectedInputs([
      ['year', year],
      ['letter1', letter1],
      ['letter2', letter2],
    ]);
    const count = await queryItemCount({ year, letter1, letter2 });
    return { benchmarkType, ...event, count };
  }

  if (benchmarkType === 'queryItemCountWithFilter') {
    const {
      year, letter1, letter2, minRunningTimeSecs,
    } = event;
    validateExpectedInputs([
      ['year', year],
      ['letter1', letter1],
      ['letter2', letter2],
      ['minRunningTimeSecs', minRunningTimeSecs],
    ]);
    const count = await queryItemCountWithFilter({
      year, letter1, letter2, minRunningTimeSecs,
    });
    return { benchmarkType, ...event, count };
  }

  if (benchmarkType === 'queryItemAggregateMetadata') {
    const {
      year, letter1, letter2, minRunningTimeSecs, fieldToAggregate,
    } = event;
    validateExpectedInputs([
      ['year', year],
      ['letter1', letter1],
      ['letter2', letter2],
      ['minRunningTimeSecs', minRunningTimeSecs],
      ['fieldToAggregate', fieldToAggregate],
    ]);
    const aggregateMetadata = await queryItemAggregateMetadata({
      year, letter1, letter2, minRunningTimeSecs, fieldToAggregate,
    });
    aggregateMetadata.average = aggregateMetadata.sum / aggregateMetadata.count;
    return { benchmarkType, ...event, ...aggregateMetadata };
  }

  if (benchmarkType === 'queryItemAggregateMetadataGeneric') {
    // TODO: Support Generic Input Mapping
    const {
      year, letter1, letter2, minRunningTimeSecs, fieldToAggregate,
    } = event;
    validateExpectedInputs([
      ['year', year],
      ['letter1', letter1],
      ['letter2', letter2],
      ['minRunningTimeSecs', minRunningTimeSecs],
      ['fieldToAggregate', fieldToAggregate],
    ]);
    const aggregateMetadata = await queryItemAggregateMetadataGeneric({
      year, letter1, letter2, minRunningTimeSecs, fieldToAggregate,
    });
    return { benchmarkType, ...event, ...aggregateMetadata };
  }

  if (benchmarkType === 'queryItemAggregateMetadataGenericFixedInput') {
    const aggregateMetadata = await queryItemAggregateMetadataGeneric({
      tableName: process.env.MOVIES_TABLE_NAME,
      partitionKeyComparison: {
        fieldName: 'year',
        comparedValue: 2040,
      },
      sortKeyComparison: {
        fieldName: 'title',
        comparisonType: 'BETWEEN',
        rangeStart: 'A',
        rangeEnd: 'Z',
      },
      filterComparisons: [{
        fieldName: 'info.running_time_secs',
        comparisonType: 'GTE',
        comparedValue: 5400,
      }],
      aggregateField: 'info.running_time_secs',
    });
    return { benchmarkType, ...event, ...aggregateMetadata };
  }

  throw new Error('Something went wrong');
};

// Gotchas so far, filter expressions with dots are kind of weird
// it's not obvious yet how to generically support either names w/ a dot in them (which need) to go into a keyExpressionAlias,
// or those which are nested, and need to be referenced directly. It may be a non-issue, since I'm not sure we support dot-names in gql.
// Additionally, this only supports numbers today, not sure if that's something we need to break longer term.
