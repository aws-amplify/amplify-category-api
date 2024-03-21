import { attributeTypeFromType, overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import { getTable } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerPrepareStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ModelResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { getSortKeyFields } from './schema';
import { HasManyDirectiveConfiguration } from './types';
import { getConnectionAttributeName, getObjectPrimaryKey } from './utils';

/**
 * Creates a GSI on the table of the `relatedType` based on the config's `references` / `referenceNodes`
 *
 * @remarks
 * This method sets the `indexName` property of the `config` to the GSI name created on the
 * table of the `relatedType`
 *
 * Preconditions: `config.references >= 1` and `config.referenceNodes >= 1`
 *
 * @param config The `HasManyDirectiveConfiguration` for DDB references.
 * @param ctx The `TransformerContextProvider` for DDB references.
 */
export const updateTableForReferencesConnection = (
  config: HasManyDirectiveConfiguration, // TODO: Add support for HasOneDirectiveConfiguration
  ctx: TransformerContextProvider,
): void => {
  const { field, referenceNodes, indexName: incomingIndexName, object, references, relatedType } = config;
  const mappedObjectName = ctx.resourceHelper.getModelNameMapping(object.name.value);

  if (incomingIndexName) {
    throw new Error(`Invalid @hasMany directive on ${mappedObjectName}.${field.name.value} - indexName is not supported with DDB references.`);
  }

  if (references.length < 1 || referenceNodes.length < 1) {
    throw new Error('references should not be empty here'); // TODO: better error message
  }

  const indexName = `gsi-${mappedObjectName}.${field.name.value}`;
  config.indexName = indexName;

  const relatedTable = getTable(ctx, relatedType);
  const gsis = relatedTable.globalSecondaryIndexes;
  if (gsis.some((gsi: any) => gsi.indexName === indexName)) {
    // TODO: In the existing `fields` based implementation, this returns.
    // However, this is likely a schema misconfiguration in the `references`
    // world because we don't support specifying indexName.
    return;
  }

  // `referenceNodes` are ordered based on the `references` argument in the `@<relational-directive>(references:)`
  // argument. If we've gotten this far, the array is not empty and the passed `references` args represent valid
  // fields on the related type.
  //
  // The first element (required) is the parition key of the GSI we're about to create.
  // Any remaining elements (optional) represent the sort key of the GSI we're about to create.
  const referenceNode = referenceNodes[0];
  const partitionKeyName = referenceNode.name.value;
  // Grabbing the type of the related field.
  // TODO: Validate types of related field and primary's pk match
  // -- ideally further up the chain
  const partitionKeyType = attributeTypeFromType(referenceNode.type, ctx);

  // TODO: Add support for sortKey in GSI
  const sortKey = undefined;

  addGlobalSecondaryIndex(relatedTable, {
    indexName: indexName,
    partitionKey: { name: partitionKeyName, type: partitionKeyType },
    sortKey: sortKey,
    ctx: ctx,
    relatedTypeName: relatedType.name.value,
  });
};

/**
 * adds GSI to the table if it doesn't already exists for connection
 */
export const updateTableForConnection = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { fields, indexName: incomingIndexName } = config;

  // If an index name or list of fields was specified, then we don't need to create a GSI here.
  if (incomingIndexName || fields.length > 0) {
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

  const sortKey = respectPrimaryKeyAttributesOnConnectionField
    ? getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject(ctx, object, field, getSortKeyFields(ctx, object))
    : undefined;

  addGlobalSecondaryIndex(table, {
    indexName: indexName,
    partitionKey: { name: partitionKeyName, type: partitionKeyType },
    sortKey: sortKey,
    ctx: ctx,
    relatedTypeName: relatedType.name.value,
  });
};

const addGlobalSecondaryIndex = (
  table: any,
  props: {
    indexName: string;
    partitionKey: KeyAttributeDefinition;
    sortKey: KeyAttributeDefinition | undefined;
    ctx: TransformerContextProvider;
    relatedTypeName: string;
  },
): void => {
  const { indexName, partitionKey, sortKey, ctx, relatedTypeName } = props;

  table.addGlobalSecondaryIndex({
    indexName,
    projectionType: 'ALL',
    partitionKey: {
      name: partitionKey.name,
      type: partitionKey.type,
    },
    sortKey: sortKey
      ? {
          name: sortKey.name,
          type: sortKey.type,
        }
      : undefined,
    readCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
    writeCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
  });

  // At the L2 level, the CDK does not handle the way Amplify sets GSI read and write capacity
  // very well. At the L1 level, the CDK does not create the correct IAM policy for accessing the
  // GSI. To get around these issues, keep the L1 and L2 GSI list in sync.
  const gsi = table.globalSecondaryIndexes.find((g: any) => g.indexName === indexName);

  const newIndex = {
    indexName,
    keySchema: gsi.keySchema,
    projection: { projectionType: 'ALL' },
    provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
      ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    }),
  };

  overrideIndexAtCfnLevel(ctx, relatedTypeName, table, newIndex);
};

type KeyAttributeDefinition = {
  name: string;
  type: 'S' | 'N';
};

const getConnectedSortKeyAttributeDefinitionsForImplicitHasManyObject = (
  ctx: TransformerContextProvider,
  object: ObjectTypeDefinitionNode,
  hasManyField: FieldDefinitionNode,
  sortKeyFields: FieldDefinitionNode[],
): KeyAttributeDefinition | undefined => {
  if (!sortKeyFields.length) {
    return undefined;
  }
  const mappedObjectName = ctx.resourceHelper.getModelNameMapping(object.name.value);
  const connectedSortKeyFieldNames: string[] = sortKeyFields.map((sortKeyField) =>
    getConnectionAttributeName(ctx.transformParameters, mappedObjectName, hasManyField.name.value, sortKeyField.name.value),
  );
  if (connectedSortKeyFieldNames.length === 1) {
    return {
      name: connectedSortKeyFieldNames[0],
      type: attributeTypeFromType(sortKeyFields[0].type, ctx),
    };
  } else if (sortKeyFields.length > 1) {
    return {
      name: condenseRangeKey(connectedSortKeyFieldNames),
      type: 'S',
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
