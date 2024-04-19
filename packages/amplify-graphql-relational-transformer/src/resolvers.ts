import { attributeTypeFromType, overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import { generateApplyDefaultsToInputTemplate } from '@aws-amplify/graphql-model-transformer';
import { InvalidDirectiveError, MappingTemplate, getTable } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerResolverProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import {
  bool,
  compoundExpression,
  forEach,
  ifElse,
  iff,
  list,
  methodCall,
  print,
  printBlock,
  qref,
  raw,
  ref,
  set,
  str,
} from 'graphql-mapping-template';
import { ModelResourceIDs, ResourceConstants, graphqlName, toCamelCase, toUpper } from 'graphql-transformer-common';
import { getSortKeyFields } from './schema';
import { HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from './types';
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
 * @param config The `HasManyDirectiveConfiguration` for DynamoDB references.
 * @param ctx The `TransformerContextProvider` for DynamoDB references.
 */
export const updateTableForReferencesConnection = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): void => {
  const { referenceNodes, indexName, references, relatedType } = config;

  if (references.length < 1 || referenceNodes.length < 1) {
    // We've validated that references are not-empty further upstream.
    // If this `if` block is hit, we can't continue.
    throw new Error(`references not found for ${config.object.name.value}.${config.field.name.value} @${config.directiveName}`);
  }

  const relatedTable = getTable(ctx, relatedType);
  const gsis = relatedTable.globalSecondaryIndexes;
  if (gsis.some((gsi: any) => gsi.indexName === indexName)) {
    // We create a GSI on the Related model's table for querying
    // relationships using the format 'gsi-{PrimaryModelName}.{PrimaryModelConnectionField}'
    // If the related table already has a GSI with that name, bail to prevent
    // undefined runtime behavior.
    throw new InvalidDirectiveError(
      `Global secondary index ${indexName} defined on ${relatedType.name.value} conflicts with the naming convention` +
        ' used to create implicit GSIs for querying relationships.' +
        ' Please rename your @index',
    );
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
  const partitionKeyType = attributeTypeFromType(referenceNode.type, ctx);

  // The sortKeys are any referencesNodes following the first element.
  const sortKeyReferenceNodes = referenceNodes.slice(1);
  const sortKey = getReferencesBasedDDBSortKey(sortKeyReferenceNodes, ctx);

  addGlobalSecondaryIndex(relatedTable, {
    indexName: indexName,
    partitionKey: { name: partitionKeyName, type: partitionKeyType },
    sortKey: sortKey,
    ctx: ctx,
    relatedTypeName: relatedType.name.value,
  });
};

/**
 * Given a list a `FieldDefinitionNode`s representing sortKeys for a references based relationship where the
 * related model's data source is DDB, this provides the sortKey as a `KeyAttributeDefinition`.
 * @param sortKeyNodes The `FieldDefinitionNode`s representing sortKeys of the references based relationship.
 * @param ctx The `TransformerContextProvider` passed down the transformer chain.
 * @returns A `KeyAttributeDefinition` representing the sort key to be added to a DDB table.
 */
const getReferencesBasedDDBSortKey = (
  sortKeyNodes: FieldDefinitionNode[],
  ctx: TransformerContextProvider,
): KeyAttributeDefinition | undefined => {
  if (sortKeyNodes.length === 1) {
    // If there's only one sortKeysFields defined, we'll use its type.
    return {
      name: sortKeyNodes[0].name.value,
      type: attributeTypeFromType(sortKeyNodes[0].type, ctx),
    };
  } else if (sortKeyNodes.length > 1) {
    // If there's more than one sortKeysFields defined, we'll combine the names with
    // a `#` delimiter with a type `S` (string).
    const sortKeyFieldNames = sortKeyNodes.map((node) => node.name.value);
    return {
      name: condenseRangeKey(sortKeyFieldNames),
      type: 'S',
    };
  }

  // If no sortKeysFields are defined, the returned sortKey is `undefined`.
  return undefined;
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

/**
 * In a DynamoDB references based relationship, when the Primary model has a primary key with composite
 * sort key (>= 2 sort key fields), we need to add function slots in the Mutation resolvers (create, update, delete)
 * of the Related model in order to write the composite sort key attribute to the Related model's table.
 *
 * For example, if a sort key is comprised of `foo` and `bar`, we are going to create a function in the Mutation
 * resolver to write a `foo#bar` attribute to the table. This is necessary to support querying Primary.related
 * with composite sort keys.
 *
 * @param config A `HasMany-`/`HasOneDirectiveConfiguration` where the related type's data source is a DynamoDB table.
 * @param ctx The TransformerContextProvider for from the `HasMany-`/`HasOneTransformer`
 * @returns void
 */
export const updateRelatedModelMutationResolversForCompositeSortKeys = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): void => {
  const { relatedType, referenceNodes } = config;
  // We add additional mutation resolver functions to write the composite sortKey
  // attribute to the table.
  // If we have < 3 `referenceNodes` (< 2 sortKey), we can bail now.
  if (referenceNodes.length < 3) {
    return;
  }

  const objectName = ctx.output.getMutationTypeName();
  if (!objectName) {
    throw new Error(`
      Mutation type name is undefined when updated mutation resolvers for composite sortKeys used in DynamoDB references based relationships.
      This should not happen, please file a bug at https://github.com/aws-amplify/amplify-category-api/issues/new/choose`);
  }

  const capitalizedName = toUpper(relatedType.name.value);
  const operationTypes = ['update', 'create'] as const;

  operationTypes
    .map((operationType) => ({
      operationType: operationType,
      resolver: ctx.resolvers.getResolver(objectName, `${operationType}${capitalizedName}`),
    }))
    .forEach((mutation) => {
      if (!mutation.resolver) {
        return;
      }
      const checks = [
        // The mutation resolver should confirm that all sort keys are provided.
        validateCompositeSortKeyMutationArgumentSnippet(config, mutation.operationType),
        // The mutation resolver adds the concatenated sort key fields to
        // `ctx.args.input` in the pipeline before the call to DDB occurs.
        ensureCompositeKeySnippet(config),
      ];

      if (checks[0] || checks[1]) {
        addIndexToResolverSlot(mutation.resolver, [mergeInputsAndDefaultsSnippet(), ...checks]);
      }
    });
};

const addIndexToResolverSlot = (resolver: TransformerResolverProvider, lines: string[], isSync = false): void => {
  const res = resolver as any;

  res.addToSlot(
    'preAuth',
    MappingTemplate.s3MappingTemplateFromString(
      `${lines.join('\n')}\n${!isSync ? '{}' : ''}`,
      `${res.typeName}.${res.fieldName}.{slotName}.{slotIndex}.req.vtl`,
    ),
  );
};

const mergeInputsAndDefaultsSnippet = (): string => {
  return printBlock('Merge default values and inputs')(generateApplyDefaultsToInputTemplate('mergedValues'));
};

// When issuing an create/update mutation that creates/changes one part of a composite sort key, you must supply the entire key so that the
// underlying composite key can be resaved in a create/update operation. We only need to update for composite sort keys on secondary
// indexes. There is some tight coupling between setting 'hasSeenSomeKeyArg' in this method and calling ensureCompositeKeySnippet with
// conditionallySetSortKey = true That function expects this function to set 'hasSeenSomeKeyArg'.
const validateCompositeSortKeyMutationArgumentSnippet = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  keyOperation: 'create' | 'update',
): string => {
  const { indexName, references } = config;
  const sortKeyFields = references.slice(1);

  if (sortKeyFields.length < 2) {
    return '';
  }

  return printBlock(`Validate ${keyOperation} mutation for global secondary index '${indexName}'`)(
    compoundExpression([
      set(ref(ResourceConstants.SNIPPETS.HasSeenSomeKeyArg), bool(false)),
      set(ref('keyFieldNames'), list(sortKeyFields.map((f) => str(f)))),
      forEach(ref('keyFieldName'), ref('keyFieldNames'), [
        iff(raw('$mergedValues.containsKey("$keyFieldName")'), set(ref(ResourceConstants.SNIPPETS.HasSeenSomeKeyArg), bool(true)), true),
      ]),
      forEach(ref('keyFieldName'), ref('keyFieldNames'), [
        iff(
          raw(`$${ResourceConstants.SNIPPETS.HasSeenSomeKeyArg} && !$mergedValues.containsKey("$keyFieldName")`),
          raw(
            `$util.error("When ${keyOperation.replace(
              /.$/,
              'ing',
            )} any part of the composite sort key for global secondary index '${indexName}',` +
              " you must provide all fields for the key. Missing key: '$keyFieldName'.\")",
          ),
        ),
      ]),
    ]),
  );
};

// VTL that concatenates multiple sort key fields into an additional argument
// used further down the pipeline to write it to the DDB table.
const ensureCompositeKeySnippet = (config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration): string => {
  const { references } = config;
  const sortKeyFields = references.slice(1);

  if (sortKeyFields.length < 2) {
    return '';
  }

  const argsPrefix = 'mergedValues';
  const condensedSortKey = condenseRangeKey(sortKeyFields);
  const dynamoDBFriendlySortKeyName = toCamelCase(sortKeyFields.map((f) => graphqlName(f)));
  const condensedSortKeyValue = sortKeyFields
    .map((keyField) => `\${${argsPrefix}.${keyField}}`)
    .join(ModelResourceIDs.ModelCompositeKeySeparator());

  return print(
    compoundExpression([
      ifElse(
        raw(`$util.isNull($ctx.stash.metadata.${ResourceConstants.SNIPPETS.DynamoDBNameOverrideMap})`),
        qref(
          methodCall(
            ref('ctx.stash.metadata.put'),
            str(ResourceConstants.SNIPPETS.DynamoDBNameOverrideMap),
            raw(`{ '${condensedSortKey}': "${dynamoDBFriendlySortKeyName}" }`),
          ),
        ),
        qref(
          methodCall(
            ref(`ctx.stash.metadata.${ResourceConstants.SNIPPETS.DynamoDBNameOverrideMap}.put`),
            raw(`'${condensedSortKey}'`),
            str(dynamoDBFriendlySortKeyName),
          ),
        ),
      ),
      iff(ref(ResourceConstants.SNIPPETS.HasSeenSomeKeyArg), qref(`$ctx.args.input.put('${condensedSortKey}',"${condensedSortKeyValue}")`)),
    ]),
  );
};
