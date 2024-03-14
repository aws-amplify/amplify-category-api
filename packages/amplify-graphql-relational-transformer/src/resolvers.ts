import { attributeTypeFromType, overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import { getTable } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerPrepareStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ModelResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { getSortKeyFields } from './schema';
import { HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from './types';
import { getConnectionAttributeName, getObjectPrimaryKey, getRelatedType } from './utils';

export const updateTableForReferencesConnection = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider
): void => {
  const { field, fieldNodes, indexName: incomingIndexName, object, references, relatedType } = config;

  if (incomingIndexName) {
    // TODO: log warning or throw that indexName isn't supported for DDB references
    // Ideally validate this further up the chain.
  }

  if (references.length < 1) {
    throw new Error( // TODO: better error message
      'references should not be empty here'
    )
  }

  const mappedObjectName = ctx.resourceHelper.getModelNameMapping(object.name.value);
  const indexName = `gsi-${mappedObjectName}.${field.name.value}`;
  config.indexName = indexName;

  const table = getTable(ctx, relatedType);
  const gsis = table.globalSecondaryIndexes;
  if (gsis.some((gsi: any) => gsi.indexName === indexName)) {
    return; // TODO: is there a more readable way to do this? maybe `find`?
  }

  // TODO: account for multiple references
  const fieldNode = fieldNodes[0]
  const partitionKeyName = fieldNode.name.value;
  // Grabbing the type of the related field.
  // TODO: Validate types of related field and primary's pk match
  // -- ideally further up the chain
  const partitionKeyType = attributeTypeFromType(fieldNode.type, ctx)

  const respectPrimaryKeyAttributesOnConnectionField: boolean = ctx.transformParameters.respectPrimaryKeyAttributesOnConnectionField;

  const sortKeyAttributeDefinitions = respectPrimaryKeyAttributesOnConnectionField
  ? getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject(ctx, object, field, fieldNodes.slice(1))
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

  const gsi = gsis.find((g: any) => g.indexName === indexName);

  const newIndex = {
    indexName,
    keySchema: gsi.keySchema,
    projection: { projectionType: 'ALL' },
    provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
      ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    }),
  };

  overrideIndexAtCfnLevel(ctx, relatedType.name.value, table, newIndex);
}

/**
 * adds GSI to the table if it doesn't already exists for connection
 */
export const updateTableForConnection = (
  config: HasManyDirectiveConfiguration,
  ctx: TransformerContextProvider,
  relatedFields: string[]
): void => {
  const { indexName: incomingIndexName } = config;

  // If an index name or list of fields was specified, then we don't need to create a GSI here.
  if (incomingIndexName || relatedFields.length > 0) {
    return;
  }

  const { field, object, relatedType } = config;
  const mappedObjectName = ctx.resourceHelper.getModelNameMapping(object.name.value);
  const table = getTable(ctx, relatedType) as any;
  const gsis = table.globalSecondaryIndexes;

  const indexName = `gsi-${mappedObjectName}.${field.name.value}`;
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
    ? getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject(ctx, object, field, getSortKeyFields(ctx, object))
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
  const gsi = gsis.find((g: any) => g.indexName === indexName);

  const newIndex = {
    indexName,
    keySchema: gsi.keySchema,
    projection: { projectionType: 'ALL' },
    provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
      ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    }),
  };

  overrideIndexAtCfnLevel(ctx, relatedType.name.value, table, newIndex);
};

type SortKeyAttributeDefinitions = {
  sortKeyName: string;
  sortKeyType: 'S' | 'N';
};

const getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject = (
  ctx: TransformerContextProvider,
  object: ObjectTypeDefinitionNode,
  hasManyField: FieldDefinitionNode,
  fieldDefinitions: FieldDefinitionNode[],
): SortKeyAttributeDefinitions | undefined => {
  // const sortKeyFields = getSortKeyFields(ctx, object);
  const sortKeyFields = fieldDefinitions
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
  return undefined;
};

export const condenseRangeKey = (fields: string[]): string => {
  return fields.join(ModelResourceIDs.ModelCompositeKeySeparator());
};

export const setFieldMappingResolverReference = (
  context: TransformerPrepareStepContextProvider,
  mappedModelName: string,
  typeName: string,
  fieldName: string,
  isList = false,
): void => {
  const modelFieldMap = context.resourceHelper.getModelFieldMap(mappedModelName);
  if (!modelFieldMap.getMappedFields().length) {
    return;
  }
  modelFieldMap.addResolverReference({ typeName: typeName, fieldName: fieldName, isList: isList });
};
