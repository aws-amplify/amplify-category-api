import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode } from 'graphql';
import { MultiTenantDirectiveConfiguration } from '../types';
import { generateTenantIndexName } from '../utils/helpers';
import { TENANT_INDEX_SORT_KEY } from '../utils/constants';
import { ModelResourceIDs } from 'graphql-transformer-common';
import { Table, AttributeType, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { DynamoDbDataSource } from 'aws-cdk-lib/aws-appsync';
import * as cdk from 'aws-cdk-lib';

export function addTenantGlobalSecondaryIndex(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  const { object, tenantField } = config;
  const typeName = object.name.value;
  
  const table = getTable(context, object);
  if (!table) {
    throw new Error(
      `Failed to create tenant GSI for type '${typeName}'. ` +
      `Could not find DynamoDB table. ` +
      `Ensure the type has @model directive and is using DynamoDB data source.`
    );
  }

  const indexName = generateTenantIndexName(typeName, tenantField);

  try {
    table.addGlobalSecondaryIndex({
      indexName,
      projectionType: ProjectionType.ALL,
      partitionKey: {
        name: tenantField,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: TENANT_INDEX_SORT_KEY,
        type: AttributeType.STRING,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to add GSI '${indexName}' to table for type '${typeName}'. ` +
      `This is required for multi-tenant data isolation. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function getTable(context: TransformerContextProvider, object: ObjectTypeDefinitionNode): Table | undefined {
  const ddbDataSource = context.dataSources.get(object) as DynamoDbDataSource;
  if (!ddbDataSource || !ddbDataSource.ds) {
    return undefined;
  }

  const tableName = ModelResourceIDs.ModelTableResourceID(object.name.value);
  const table = ddbDataSource.ds.stack.node.tryFindChild(tableName);
  
  if (!table || !(table instanceof Table)) {
    return undefined;
  }
  
  return table;
}
