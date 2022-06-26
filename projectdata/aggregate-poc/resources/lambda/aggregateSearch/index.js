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
      if (fieldName.includes('.')) {
        return {
          expressionString: `${fieldName} BETWEEN :${comparisonAlias}Start AND :${comparisonAlias}End`,
          expressionAttributeName: {},
          expressionAttributeValues: {
            [`:${comparisonAlias}Start`]: rangeStart,
            [`:${comparisonAlias}End`]: rangeEnd,
          },
        };
      }
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
      if (fieldName.includes('.')) {
        return {
          expressionString: `begins_with(${fieldName}, :${comparisonAlias})`,
          expressionAttributeName: {},
          expressionAttributeValues: { [`:${comparisonAlias}`]: comparedValue },
        };
      }
      return {
        expressionString: `begins_with(#${comparisonAlias}, :${comparisonAlias})`,
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

  console.debug(`Got response: ${JSON.stringify(data)}`);

  // TODO: Support [] index based access https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Attributes.html#Expressions.Attributes.NestedElements.DocumentPathExamples
  const accessByDocumentPath = (item, path) => {
    const pathParts = path.split('.');
    let currentValue = item;
    pathParts.forEach(pathPart => {
      if (currentValue === undefined || currentValue === null) {
        return undefined;
      }
      currentValue = currentValue[pathPart];
    });
    return currentValue;
  };

  // TODO: Do this all in one pass.
  const aggregateValues = data.Items
    .map(item => accessByDocumentPath(item, ProjectionExpression))
    .filter(itemVal => itemVal !== undefined && itemVal !== null)
    .filter(itemVal => typeof itemVal === 'number');

  console.debug(`Got ${aggregateValues.length} values after processing`);

  count += aggregateValues.length;
  sum += aggregateValues.reduce((previousValue, currentValue) => previousValue + currentValue, 0);
  min = Math.min(min, ...aggregateValues);
  max = Math.max(max, ...aggregateValues);

  if (typeof data.LastEvaluatedKey !== 'undefined') {
    const recursiveResponse = await queryItemAggregateMetadataGeneric({
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

/**
 * Entry point to the lambda function.
 */
// eslint-disable-next-line max-lines-per-function
exports.handler = async event => {
  console.debug(event);

  const {
    tableName, partitionKeyComparison, sortKeyComparison, filterComparisons, aggregateField,
  } = event;

  const aggregateMetadata = await queryItemAggregateMetadataGeneric({
    tableName,
    partitionKeyComparison,
    sortKeyComparison,
    filterComparisons,
    aggregateField,
  });

  console.debug(`Returning: ${JSON.stringify(aggregateMetadata)}`);

  return { ...event, ...aggregateMetadata };
};

// Gotchas so far, filter expressions with dots are kind of weird
// it's not obvious yet how to generically support either names w/ a dot in them (which need) to go into a keyExpressionAlias,
// or those which are nested, and need to be referenced directly. It may be a non-issue, since I'm not sure we support dot-names in gql.
// Additionally, this only supports numbers today, not sure if that's something we need to break longer term.
