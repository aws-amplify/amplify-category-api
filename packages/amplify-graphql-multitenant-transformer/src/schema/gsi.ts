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
  const { object, tenantField, indexName, sortKeyFields } = config;
  const typeName = object.name.value;
  
  const table = getTable(context, object);
  if (!table) {
    throw new Error(
      `Failed to create tenant GSI for type '${typeName}'. ` +
      `Could not find DynamoDB table. ` +
      `Ensure the type has @model directive and is using DynamoDB data source.`
    );
  }

  const gsiName = indexName || generateTenantIndexName(typeName, tenantField);
  const sortKeyName = sortKeyFields?.[0] || TENANT_INDEX_SORT_KEY;

  let projectionType: ProjectionType = ProjectionType.ALL;
  let nonKeyAttributes: string[] | undefined = undefined;

  if (config.projectionType) {
    switch (config.projectionType.toUpperCase()) {
      case 'ALL':
        projectionType = ProjectionType.ALL;
        break;
      case 'KEYS_ONLY':
        projectionType = ProjectionType.KEYS_ONLY;
        break;
      case 'INCLUDE':
        projectionType = ProjectionType.INCLUDE;
        nonKeyAttributes = config.projectionKeys;
        if (!nonKeyAttributes || nonKeyAttributes.length === 0) {
          throw new Error(
            `When using projectionType "INCLUDE", you must provide "projectionKeys" in @multiTenant directive on type '${typeName}'.`
          );
        }
        break;
      default:
        throw new Error(
          `Invalid projectionType '${config.projectionType}' on type '${typeName}'. Allowed values: ALL, KEYS_ONLY, INCLUDE.`
        );
    }
  }

  try {
    table.addGlobalSecondaryIndex({
      indexName: gsiName,
      projectionType,
      partitionKey: {
        name: tenantField,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: sortKeyName,
        type: AttributeType.STRING,
      },
      nonKeyAttributes,
    });
  } catch (error) {
    throw new Error(
      `Failed to add GSI '${gsiName}' to table for type '${typeName}'. ` +
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
