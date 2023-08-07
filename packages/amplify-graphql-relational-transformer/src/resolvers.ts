import { attributeTypeFromType } from '@aws-amplify/graphql-index-transformer';
import { getKeySchema, getTable, MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import {
  and,
  bool,
  compoundExpression,
  DynamoDBMappingTemplate,
  equals,
  Expression,
  ifElse,
  iff,
  int,
  isNullOrEmpty,
  list,
  methodCall,
  not,
  nul,
  obj,
  ObjectNode,
  or,
  print,
  qref,
  raw,
  ref,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import {
  applyCompositeKeyConditionExpression,
  applyKeyConditionExpression,
  attributeTypeFromScalar,
  ModelResourceIDs,
  NONE_VALUE,
  ResolverResourceIDs,
  ResourceConstants,
  setArgs,
  toCamelCase,
} from 'graphql-transformer-common';
import { getSortKeyFields } from './schema';
import { HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from './types';
import { getConnectionAttributeName, getObjectPrimaryKey } from './utils';

const CONNECTION_STACK = 'ConnectionStack';
const authFilter = ref('ctx.stash.authFilter');
const PARTITION_KEY_VALUE = 'partitionKeyValue';
const SORT_KEY_VALUE = 'sortKeyValue';

/**
 * adds GSI to the table if it doesn't already exists for connection
 */
export function updateTableForConnection(config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider) {
  let { fields, indexName } = config;

  // If an index name or list of fields was specified, then we don't need to create a GSI here.
  if (indexName || fields.length > 0) {
    return;
  }

  const { field, object, relatedType } = config;
  const mappedObjectName = ctx.resourceHelper.getModelNameMapping(object.name.value);
  const table = getTable(ctx, relatedType) as any;
  const gsis = table.globalSecondaryIndexes;

  indexName = `gsi-${mappedObjectName}.${field.name.value}`;
  config.indexName = indexName;

  // Check if the GSI already exists.
  if (gsis.some((gsi: any) => gsi.indexName === indexName)) {
    return;
  }

  const respectPrimaryKeyAttributesOnConnectionField: boolean = ctx.transformParameters.respectPrimaryKeyAttributesOnConnectionField;
  const partitionKeyName = getConnectionAttributeName(
    ctx.transformParameters,
    mappedObjectName,
    field.name.value,
    getObjectPrimaryKey(object).name.value,
  );
  const partitionKeyType = respectPrimaryKeyAttributesOnConnectionField
    ? attributeTypeFromType(getObjectPrimaryKey(object).type, ctx)
    : 'S';
  const sortKeyAttributeDefinitions = respectPrimaryKeyAttributesOnConnectionField
    ? getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject(ctx, object, field)
    : undefined;
  table.addGlobalSecondaryIndex({
    indexName,
    projectionType: 'ALL',
    partitionKey: {
      name: partitionKeyName,
      type: partitionKeyType,
    },
    sortKey: sortKeyAttributeDefinitions
      ? {
          name: sortKeyAttributeDefinitions.sortKeyName,
          type: sortKeyAttributeDefinitions.sortKeyType,
        }
      : undefined,
    readCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
    writeCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
  });

  // At the L2 level, the CDK does not handle the way Amplify sets GSI read and write capacity
  // very well. At the L1 level, the CDK does not create the correct IAM policy for accessing the
  // GSI. To get around these issues, keep the L1 and L2 GSI list in sync.
  const cfnTable = table.table;
  const gsi = gsis.find((gsi: any) => gsi.indexName === indexName);

  cfnTable.globalSecondaryIndexes = appendIndex(cfnTable.globalSecondaryIndexes, {
    indexName,
    keySchema: gsi.keySchema,
    projection: { projectionType: 'ALL' },
    provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
      ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    }),
  });
}

function appendIndex(list: any, newIndex: any): any[] {
  if (Array.isArray(list)) {
    list.push(newIndex);
    return list;
  }

  return [newIndex];
}

type SortKeyAttributeDefinitions = {
  sortKeyName: string;
  sortKeyType: 'S' | 'N';
};

function getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject(
  ctx: TransformerContextProvider,
  object: ObjectTypeDefinitionNode,
  hasManyField: FieldDefinitionNode,
): SortKeyAttributeDefinitions | undefined {
  const sortKeyFields = getSortKeyFields(ctx, object);
  if (!sortKeyFields.length) {
    return undefined;
  }
  const mappedObjectName = ctx.resourceHelper.getModelNameMapping(object.name.value);
  const connectedSortKeyFieldNames: string[] = sortKeyFields.map((sortKeyField) =>
    getConnectionAttributeName(ctx.transformParameters, mappedObjectName, hasManyField.name.value, sortKeyField.name.value),
  );
  if (connectedSortKeyFieldNames.length === 1) {
    return {
      sortKeyName: connectedSortKeyFieldNames[0],
      sortKeyType: attributeTypeFromType(sortKeyFields[0].type, ctx),
    };
  } else if (sortKeyFields.length > 1) {
    return {
      sortKeyName: condenseRangeKey(connectedSortKeyFieldNames),
      sortKeyType: 'S',
    };
  }
}

export const condenseRangeKey = (fields: string[]): string => {
  return fields.join(ModelResourceIDs.ModelCompositeKeySeparator());
};
