/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModelDataSourceStrategyDbType, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DynamoDbDataSource } from 'aws-cdk-lib/aws-appsync';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ListValueNode, ObjectTypeDefinitionNode, StringValueNode, TypeNode } from 'graphql';
import { ModelResourceIDs, getBaseType } from 'graphql-transformer-common';
import { getModelDataSourceStrategy } from './model-datasource-strategy-utils';

/**
 * Reads the list of global secondary indexes tracked on a DynamoDB L2 `Table` construct.
 *
 * aws-cdk-lib 2.260 renamed the private `globalSecondaryIndexes` array on the DynamoDB L2 `Table` to
 * `_globalSecondaryIndexes` (now an `ArrayBox` exposing the same `find`/`some`/`length` surface and the
 * same `{ indexName, keySchema }` element shape); Amplify's managed-table construct keeps the public
 * `globalSecondaryIndexes` array. This reads whichever exists (covers standard `Table` + Amplify managed
 * table). Centralized so a future CDK rename is a one-line fix.
 */
export const getGlobalSecondaryIndexes = (table: any): any => table['_globalSecondaryIndexes'] ?? table.globalSecondaryIndexes;

/**
 * getKeySchema
 */
export const getKeySchema = (table: any, indexName?: string): any => {
  // aws-cdk-lib 2.260 renamed the private `localSecondaryIndexes` array on the DynamoDB L2 `Table` to
  // `_localSecondaryIndexes` (now an `ArrayBox` exposing the same `find` surface and element shape).
  // Amplify's managed-table construct keeps the public array name. Read the renamed field first, falling
  // back to the public one so both table types resolve correctly.
  const globalSecondaryIndexes = getGlobalSecondaryIndexes(table);
  const localSecondaryIndexes = table['_localSecondaryIndexes'] ?? table.localSecondaryIndexes;
  return (
    (
      globalSecondaryIndexes.find((gsi: any) => gsi.indexName === indexName) ??
      localSecondaryIndexes.find((gsi: any) => gsi.indexName === indexName)
    )?.keySchema ?? table.keySchema
  );
};

/**
 * getTable
 */
export const getTable = (ctx: TransformerContextProvider, object: ObjectTypeDefinitionNode): any => {
  const ddbDataSource = ctx.dataSources.get(object) as DynamoDbDataSource;
  const tableName = ModelResourceIDs.ModelTableResourceID(object.name.value);
  const table = ddbDataSource.ds.stack.node.findChild(tableName) as Table;

  if (!table) {
    throw new Error(`Table not found for name ${tableName}`);
  }
  return table;
};

/**
 * getSortKeyFieldNames
 */
export const getSortKeyFieldNames = (type: ObjectTypeDefinitionNode): string[] => {
  const sortKeyFieldNames: string[] = [];

  type.fields!.forEach((field) => {
    field.directives!.forEach((directive) => {
      if (directive.name.value === 'primaryKey') {
        const values = directive.arguments?.find((arg) => arg.name.value === 'sortKeyFields')?.value as ListValueNode;
        if (values) {
          sortKeyFieldNames.push(...values.values.map((it) => (it as StringValueNode).value));
        }
      }
    });
  });

  return sortKeyFieldNames;
};

/**
 * Get ModelDataSourceStrategyDbType from the transformer context
 */
export const getStrategyDbTypeFromTypeNode = (type: TypeNode, ctx: TransformerContextProvider): ModelDataSourceStrategyDbType => {
  const baseTypeName = getBaseType(type);
  const strategy = getModelDataSourceStrategy(ctx, baseTypeName);
  return strategy.dbType;
};
