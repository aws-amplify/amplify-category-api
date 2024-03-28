import { generateApplyDefaultsToInputTemplate } from '@aws-amplify/graphql-model-transformer';
import {
  DDB_DB_TYPE,
  getModelDataSourceNameForTypeName,
  getModelDataSourceStrategy,
  isAmplifyDynamoDbModelDataSourceStrategy,
  MappingTemplate,
  MYSQL_DB_TYPE,
  POSTGRES_DB_TYPE,
} from '@aws-amplify/graphql-transformer-core';
import {
  DataSourceProvider,
  TransformerContextProvider,
  TransformerResolverProvider,
  ModelDataSourceStrategyDbType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DynamoDbDataSource } from 'aws-cdk-lib/aws-appsync';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import { Kind, ObjectTypeDefinitionNode, TypeNode } from 'graphql';
import {
  and,
  block,
  bool,
  compoundExpression,
  Expression,
  forEach,
  ifElse,
  iff,
  int,
  list,
  methodCall,
  not,
  obj,
  print,
  printBlock,
  qref,
  raw,
  ref,
  RESOLVER_VERSION_ID,
  set,
  str,
  notEquals,
  toJson,
  CompoundExpressionNode,
  ObjectNode,
  equals,
  ret,
} from 'graphql-mapping-template';
import {
  applyKeyExpressionForCompositeKey,
  attributeTypeFromScalar,
  getBaseType,
  graphqlName,
  ModelResourceIDs,
  ResolverResourceIDs,
  ResourceConstants,
  toCamelCase,
} from 'graphql-transformer-common';
import { isDynamoDbType, isSqlModel } from '@aws-amplify/graphql-transformer-core';
import { IndexDirectiveConfiguration, PrimaryKeyDirectiveConfiguration } from '../types';
import { lookupResolverName } from '../utils';
import { RDSIndexVTLGenerator, DynamoDBIndexVTLGenerator } from './generators';

const API_KEY = 'API Key Authorization';
const IAM_AUTH_TYPE = 'IAM Authorization';

/**
 * replaceDdbPrimaryKey
 */
export const replaceDdbPrimaryKey = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  // Replace the table's primary key with the value from @primaryKey
  const { field, object } = config;
  const strategy = getModelDataSourceStrategy(ctx, object.name.value);
  const useAmplifyManagedTableResources = isAmplifyDynamoDbModelDataSourceStrategy(strategy);
  const table = getTable(ctx, object) as any;
  const cfnTable = useAmplifyManagedTableResources ? table.node.defaultChild.node.defaultChild : table.table;
  const tableAttrDefs = table.attributeDefinitions;
  const tableKeySchema = table.keySchema;
  const keySchema = getDdbKeySchema(config);
  const attrDefs = attributeDefinitions(config, ctx);
  const existingAttrDefSet = new Set(tableAttrDefs.map((ad: any) => ad.attributeName));
  const primaryKeyPartitionKeyName = field.name.value ?? 'id';
  const primaryKeyPartitionKeyType = attrDefs.find((attr) => attr.attributeName === primaryKeyPartitionKeyName)?.attributeType ?? 'S';

  // First, remove any attribute definitions in the current primary key.
  for (const existingKey of tableKeySchema) {
    if (existingAttrDefSet.has(existingKey.attributeName)) {
      table.attributeDefinitions = tableAttrDefs.filter((ad: any) => ad.attributeName !== existingKey.attributeName);
      existingAttrDefSet.delete(existingKey.attributeName);
    }
  }

  // Next, replace the key schema and add any new attribute definitions back.
  table.keySchema = keySchema;
  table.tablePartitionKey = { name: primaryKeyPartitionKeyName, type: primaryKeyPartitionKeyType };

  for (const attr of attrDefs) {
    if (!existingAttrDefSet.has(attr.attributeName)) {
      table.attributeDefinitions.push(attr);
    }
  }

  // CDK does not support modifying all of these things, so keep them in sync.
  if (useAmplifyManagedTableResources) {
    cfnTable.addPropertyOverride('keySchema', table.keySchema);
    cfnTable.addPropertyOverride('attributeDefinitions', table.attributeDefinitions);
  } else {
    cfnTable.keySchema = table.keySchema;
    cfnTable.attributeDefinitions = table.attributeDefinitions;
  }
};

/**
 * updateResolvers
 */
export const updateResolvers = (
  config: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
  resolverMap: Map<TransformerResolverProvider, string>,
): void => {
  const getResolver = getResolverObject(config, ctx, 'get');
  const listResolver = getResolverObject(config, ctx, 'list');
  const createResolver = getResolverObject(config, ctx, 'create');
  const updateResolver = getResolverObject(config, ctx, 'update');
  const deleteResolver = getResolverObject(config, ctx, 'delete');
  const syncResolver = getResolverObject(config, ctx, 'sync');

  if (getResolver) {
    addIndexToResolverSlot(getResolver, [setPrimaryKeySnippet(config, false)]);
  }

  if (listResolver) {
    addIndexToResolverSlot(listResolver, [
      print(setQuerySnippet(config, ctx, true)),
      `$util.qr($ctx.stash.put("${ResourceConstants.SNIPPETS.ModelQueryExpression}", $${ResourceConstants.SNIPPETS.ModelQueryExpression}))`,
    ]);
  }

  if (createResolver) {
    addIndexToResolverSlot(createResolver, [
      mergeInputsAndDefaultsSnippet(),
      setPrimaryKeySnippet(config, true),
      ensureCompositeKeySnippet(config, false),
    ]);
  }

  if (updateResolver) {
    addIndexToResolverSlot(updateResolver, [
      mergeInputsAndDefaultsSnippet(),
      setPrimaryKeySnippet(config, true),
      ensureCompositeKeySnippet(config, false),
    ]);
  }

  if (deleteResolver) {
    addIndexToResolverSlot(deleteResolver, [mergeInputsAndDefaultsSnippet(), setPrimaryKeySnippet(config, true)]);
  }

  if (syncResolver) {
    makeSyncResolver('dbTable', config, ctx, syncResolver, resolverMap);
  }
};

const getTable = (context: TransformerContextProvider, object: ObjectTypeDefinitionNode): Table => {
  const ddbDataSource = context.dataSources.get(object) as DynamoDbDataSource;
  const tableName = ModelResourceIDs.ModelTableResourceID(object.name.value);
  const table = ddbDataSource.ds.stack.node.findChild(tableName) as Table;

  if (!table) {
    throw new Error(`Table not found in stack with table name ${tableName}`);
  }
  return table;
};

const getDdbKeySchema = (config: PrimaryKeyDirectiveConfiguration): { attributeName: string; keyType: string }[] => {
  const schema = [{ attributeName: config.field.name.value, keyType: 'HASH' }];

  if (config.sortKey.length > 0) {
    schema.push({ attributeName: getSortKeyName(config), keyType: 'RANGE' });
  }

  return schema;
};

export const attributeTypeFromType = (type: TypeNode, ctx: TransformerContextProvider): 'S' | 'N' => {
  const baseTypeName = getBaseType(type);
  const ofType = ctx.output.getType(baseTypeName);
  if (ofType && ofType.kind === Kind.ENUM_TYPE_DEFINITION) {
    return 'S';
  }
  return attributeTypeFromScalar(type);
};

const attributeDefinitions = (
  config: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
): {
  attributeName: string;
  attributeType: 'S' | 'N';
}[] => {
  const { field, sortKey, sortKeyFields } = config;
  const definitions = [{ attributeName: field.name.value, attributeType: attributeTypeFromType(field.type, ctx) }];

  if (sortKeyFields.length === 1) {
    definitions.push({
      attributeName: sortKeyFields[0],
      attributeType: attributeTypeFromType(sortKey[0].type, ctx),
    });
  } else if (sortKeyFields.length > 1) {
    definitions.push({
      attributeName: getSortKeyName(config),
      attributeType: 'S',
    });
  }

  return definitions;
};

const getSortKeyName = (config: PrimaryKeyDirectiveConfiguration): string => {
  return config.sortKeyFields.join(ModelResourceIDs.ModelCompositeKeySeparator());
};

export const getResolverObject = (
  config: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
  op: string,
): TransformerResolverProvider | null => {
  const resolverName = lookupResolverName(config, ctx, op);

  if (!resolverName) {
    return null;
  }

  const objectName = op === 'get' || op === 'list' || op === 'sync' ? ctx.output.getQueryTypeName() : ctx.output.getMutationTypeName();

  if (!objectName) {
    return null;
  }

  return ctx.resolvers.getResolver(objectName, resolverName) ?? null;
};

const setPrimaryKeySnippet = (config: PrimaryKeyDirectiveConfiguration, isMutation: boolean): string => {
  const cmds: Expression[] = [
    qref(
      methodCall(ref('ctx.stash.metadata.put'), str(ResourceConstants.SNIPPETS.ModelObjectKey), modelObjectKeySnippet(config, isMutation)),
    ),
  ];

  return printBlock('Set the primary key')(compoundExpression(cmds));
};

const modelObjectKeySnippet = (config: PrimaryKeyDirectiveConfiguration, isMutation: boolean): ObjectNode => {
  const { field, sortKeyFields } = config;
  const argsPrefix = isMutation ? 'mergedValues' : 'ctx.args';
  const modelObject = {
    [field.name.value]: ref(`util.dynamodb.toDynamoDB($${argsPrefix}.${field.name.value})`),
  };

  if (sortKeyFields.length > 1) {
    const compositeSortKey = getSortKeyName(config);
    const compositeSortKeyValue = sortKeyFields
      .map((keyField) => `\${${argsPrefix}.${keyField}}`)
      .join(ModelResourceIDs.ModelCompositeKeySeparator());

    modelObject[compositeSortKey] = ref(`util.dynamodb.toDynamoDB("${compositeSortKeyValue}")`);
  } else if (sortKeyFields.length === 1) {
    modelObject[sortKeyFields[0]] = ref(`util.dynamodb.toDynamoDB($${argsPrefix}.${sortKeyFields[0]})`);
  }

  return obj(modelObject);
};

export const ensureCompositeKeySnippet = (config: PrimaryKeyDirectiveConfiguration, conditionallySetSortKey: boolean): string => {
  const { sortKeyFields } = config;

  if (sortKeyFields.length < 2) {
    return '';
  }

  const argsPrefix = 'mergedValues';
  const condensedSortKey = getSortKeyName(config);
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
      conditionallySetSortKey
        ? iff(
            ref(ResourceConstants.SNIPPETS.HasSeenSomeKeyArg),
            qref(`$ctx.args.input.put('${condensedSortKey}',"${condensedSortKeyValue}")`),
          )
        : qref(`$ctx.args.input.put('${condensedSortKey}',"${condensedSortKeyValue}")`),
    ]),
  );
};

export const setQuerySnippet = (
  config: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
  isListResolver: boolean,
): CompoundExpressionNode => {
  const { field, sortKey, sortKeyFields } = config;
  const keyFields = [field, ...sortKey];
  const keyNames = [field.name.value, ...sortKeyFields];
  const keyTypes = keyFields.map((k) => attributeTypeFromType(k.type, ctx));
  const expressions = validateSortDirectionInput(config, isListResolver);
  expressions.push(
    set(ref(ResourceConstants.SNIPPETS.ModelQueryExpression), obj({})),
    applyKeyExpressionForCompositeKey(keyNames, keyTypes, ResourceConstants.SNIPPETS.ModelQueryExpression)!,
  );

  return block('Set query expression for key', expressions);
};

/**
 * Validations for sort direction input
 */
export const validateSortDirectionInput = (config: PrimaryKeyDirectiveConfiguration, isListResolver: boolean): Expression[] => {
  const { field, sortKeyFields } = config;
  const keyNames = [field.name.value, ...sortKeyFields];

  const expressions: Expression[] = [];

  if (keyNames.length === 1) {
    const sortDirectionValidation = iff(
      raw('!$util.isNull($ctx.args.sortDirection)'),
      raw('$util.error("sortDirection is not supported for List operations without a Sort key defined.", "InvalidArgumentsError")'),
    );

    expressions.push(sortDirectionValidation);
  } else if (isListResolver === true && keyNames.length >= 1) {
    // This check is only needed for List queries.
    const sortDirectionValidation = iff(
      and([raw(`$util.isNull($ctx.args.${keyNames[0]})`), raw('!$util.isNull($ctx.args.sortDirection)')]),
      raw(
        `$util.error("When providing argument 'sortDirection' you must also provide argument '${keyNames[0]}'.", "InvalidArgumentsError")`,
      ),
    );

    expressions.push(sortDirectionValidation);
  }

  return expressions;
};

/**
 * appendSecondaryIndex
 */
export const appendSecondaryIndex = (config: IndexDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { name, object, primaryKeyField } = config;
  if (isSqlModel(ctx, object.name.value)) {
    return;
  }

  const table = getTable(ctx, object) as any;
  const keySchema = getDdbKeySchema(config);
  const attrDefs = attributeDefinitions(config, ctx);
  const primaryKeyPartitionKeyName = primaryKeyField?.name?.value ?? 'id';
  const partitionKeyName = keySchema[0]?.attributeName;
  const sortKeyName = keySchema?.[1]?.attributeName;
  const partitionKeyType = attrDefs.find((attr) => attr.attributeName === partitionKeyName)?.attributeType ?? 'S';
  const sortKeyType = sortKeyName ? attrDefs.find((attr) => attr.attributeName === sortKeyName)?.attributeType ?? 'S' : undefined;

  if (!ctx.transformParameters.secondaryKeyAsGSI && primaryKeyPartitionKeyName === partitionKeyName) {
    // Create an LSI.
    table.addLocalSecondaryIndex({
      indexName: name,
      projectionType: 'ALL',
      sortKey: sortKeyName
        ? {
            name: sortKeyName,
            type: sortKeyType,
          }
        : undefined,
    });
  } else {
    // Create a GSI.
    table.addGlobalSecondaryIndex({
      indexName: name,
      projectionType: 'ALL',
      partitionKey: {
        name: partitionKeyName,
        type: partitionKeyType,
      },
      sortKey: sortKeyName
        ? {
            name: sortKeyName,
            type: sortKeyType,
          }
        : undefined,
      readCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      writeCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    });

    // At the L2 level, the CDK does not handle the way Amplify sets GSI read and write capacity
    // very well. At the L1 level, the CDK does not create the correct IAM policy for accessing the
    // GSI. To get around these issues, keep the L1 and L2 GSI list in sync.
    const newIndex = {
      indexName: name,
      keySchema,
      projection: { projectionType: 'ALL' },
      provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
        ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
        WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
      }),
    };
    overrideIndexAtCfnLevel(ctx, object.name.value, table, newIndex);
  }
};

/**
 * Util function to override the index properties in L1 level.
 * The structure for CDK L2 table is `Table -> CfnTable`, in which `table` is a property refering the CfnTable
 * For amplify dynamodb table, the structure is `AmplifyDynamoDBTable -> CustomResource -> CfnCustomResource`
 * @param ctx transformer context
 * @param typeName type name of model directive
 * @param table input table
 * @param indexInfo global secondary index properties
 */
export const overrideIndexAtCfnLevel = (ctx: TransformerContextProvider, typeName: string, table: any, indexInfo: any): void => {
  const strategy = getModelDataSourceStrategy(ctx, typeName);
  const useAmplifyManagedTableResources = isAmplifyDynamoDbModelDataSourceStrategy(strategy);

  if (!useAmplifyManagedTableResources) {
    const cfnTable = table.table;
    cfnTable.globalSecondaryIndexes = appendIndex(cfnTable.globalSecondaryIndexes, indexInfo);
  } else {
    const cfnTable = table.table.node.defaultChild;
    const idx = table.globalSecondaryIndexes.length - 1;
    cfnTable.addOverride(`Properties.globalSecondaryIndexes.${idx}`, indexInfo);
  }
};

const appendIndex = (targetList: any, newIndex: any): any[] => {
  if (Array.isArray(targetList)) {
    targetList.push(newIndex);
    return targetList;
  }

  return [newIndex];
};

/**
 * updateResolversForIndex
 */
export const updateResolversForIndex = (
  config: IndexDirectiveConfiguration,
  ctx: TransformerContextProvider,
  resolverMap: Map<TransformerResolverProvider, string>,
): void => {
  const { name, queryField, object } = config;
  if (!name) {
    throw new Error('Expected name while updating index resolvers.');
  }
  const createResolver = getResolverObject(config, ctx, 'create');
  const updateResolver = getResolverObject(config, ctx, 'update');
  const deleteResolver = getResolverObject(config, ctx, 'delete');
  const syncResolver = getResolverObject(config, ctx, 'sync');

  const dbType = getModelDataSourceStrategy(ctx, object.name.value).dbType;
  const isDynamoDB = isDynamoDbType(dbType);

  // Ensure any composite sort key values and validate update operations to
  // protect the integrity of composite sort keys.
  if (isDynamoDB && createResolver) {
    const checks = [validateIndexArgumentSnippet(config, 'create'), ensureCompositeKeySnippet(config, true)];

    if (checks[0] || checks[1]) {
      addIndexToResolverSlot(createResolver, [mergeInputsAndDefaultsSnippet(), ...checks]);
    }
  }

  if (isDynamoDB && updateResolver) {
    const checks = [validateIndexArgumentSnippet(config, 'update'), ensureCompositeKeySnippet(config, true)];

    if (checks[0] || checks[1]) {
      addIndexToResolverSlot(updateResolver, [mergeInputsAndDefaultsSnippet(), ...checks]);
    }
  }

  if (isDynamoDB && deleteResolver) {
    const checks = [ensureCompositeKeySnippet(config, false)];

    if (checks[0]) {
      addIndexToResolverSlot(deleteResolver, [mergeInputsAndDefaultsSnippet(), ...checks]);
    }
  }

  if (queryField) {
    makeQueryResolver(config, ctx, dbType);
  }

  if (isDynamoDB && syncResolver) {
    makeSyncResolver(name, config, ctx, syncResolver, resolverMap);
  }
};

export const makeQueryResolver = (
  config: IndexDirectiveConfiguration,
  ctx: TransformerContextProvider,
  dbType: ModelDataSourceStrategyDbType,
): void => {
  const { name, object, queryField } = config;
  if (!(name && queryField)) {
    throw new Error('Expected name and queryField to be defined while generating resolver.');
  }
  const modelName = object.name.value;

  const dataSourceName = getModelDataSourceNameForTypeName(ctx, modelName);
  const isDynamoDB = isDynamoDbType(dbType);
  const dataSource = ctx.api.host.getDataSource(dataSourceName);
  const queryTypeName = ctx.output.getQueryTypeName() as string;

  let stackId = object.name.value;
  if (isDynamoDB) {
    const table = getTable(ctx, object);
    stackId = table.stack.node.id;
  }

  if (!dataSource) {
    throw new Error(`Could not find datasource with name ${dataSourceName} in context.`);
  }

  const resolverResourceId = ResolverResourceIDs.ResolverResourceID(queryTypeName, queryField);
  const resolver = ctx.resolvers.generateQueryResolver(
    queryTypeName,
    queryField,
    resolverResourceId,
    dataSource as DataSourceProvider,
    MappingTemplate.s3MappingTemplateFromString(
      getVTLGenerator(dbType).generateIndexQueryRequestTemplate(config, ctx, modelName, queryField),
      `${queryTypeName}.${queryField}.req.vtl`,
    ),
    MappingTemplate.s3MappingTemplateFromString(
      print(
        compoundExpression([
          iff(ref('ctx.error'), raw('$util.error($ctx.error.message, $ctx.error.type)')),
          raw('$util.toJson($ctx.result)'),
        ]),
      ),
      `${queryTypeName}.${queryField}.res.vtl`,
    ),
  );
  resolver.addToSlot(
    'postAuth',
    MappingTemplate.s3MappingTemplateFromString(
      generateAuthExpressionForSandboxMode(ctx.transformParameters.sandboxModeEnabled, ctx.synthParameters.enableIamAccess),
      `${queryTypeName}.${queryField}.{slotName}.{slotIndex}.res.vtl`,
    ),
  );

  resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, stackId));
  ctx.resolvers.addResolver(queryTypeName, queryField, resolver);
  if (!isDynamoDB) {
    const modelFieldMap = ctx.resourceHelper.getModelFieldMap(object?.name?.value);
    if (!modelFieldMap.getMappedFields().length) {
      return;
    }
    modelFieldMap.addResolverReference({ typeName: queryTypeName, fieldName: queryField, isList: false });
  }
};

// When issuing an create/update mutation that creates/changes one part of a composite sort key, you must supply the entire key so that the
// underlying composite key can be resaved in a create/update operation. We only need to update for composite sort keys on secondary
// indexes. There is some tight coupling between setting 'hasSeenSomeKeyArg' in this method and calling ensureCompositeKeySnippet with
// conditionallySetSortKey = true That function expects this function to set 'hasSeenSomeKeyArg'.
const validateIndexArgumentSnippet = (config: IndexDirectiveConfiguration, keyOperation: 'create' | 'update'): string => {
  const { name, sortKeyFields } = config;

  if (sortKeyFields.length < 2) {
    return '';
  }

  return printBlock(`Validate ${keyOperation} mutation for @index '${name}'`)(
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
            `$util.error("When ${keyOperation.replace(/.$/, 'ing')} any part of the composite sort key for @index '${name}',` +
              " you must provide all fields for the key. Missing key: '$keyFieldName'.\")",
          ),
        ),
      ]),
    ]),
  );
};

export const mergeInputsAndDefaultsSnippet = (): string => {
  return printBlock('Merge default values and inputs')(generateApplyDefaultsToInputTemplate('mergedValues'));
};

export const addIndexToResolverSlot = (resolver: TransformerResolverProvider, lines: string[], isSync = false): void => {
  const res = resolver as any;

  res.addToSlot(
    'preAuth',
    MappingTemplate.s3MappingTemplateFromString(
      `${lines.join('\n')}\n${!isSync ? '{}' : ''}`,
      `${res.typeName}.${res.fieldName}.{slotName}.{slotIndex}.req.vtl`,
    ),
  );
};

const makeSyncResolver = (
  name: string,
  config: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
  syncResolver: TransformerResolverProvider,
  resolverMap: Map<TransformerResolverProvider, string>,
): void => {
  if (!ctx.isProjectUsingDataStore()) return;

  if (resolverMap.has(syncResolver)) {
    const prevSnippet = resolverMap.get(syncResolver)!;
    resolverMap.set(syncResolver, joinSnippets([prevSnippet, print(setSyncQueryMapSnippet(name, config))]));
  } else {
    resolverMap.set(syncResolver, print(setSyncQueryMapSnippet(name, config)));
  }
};

const joinSnippets = (lines: string[]): string => {
  return lines.join('\n');
};

const setSyncQueryMapSnippet = (name: string, config: PrimaryKeyDirectiveConfiguration): CompoundExpressionNode => {
  const { field, sortKeyFields } = config;
  const expressions: Expression[] = [];
  const keys = [field.name.value, ...(sortKeyFields ?? [])];
  expressions.push(
    raw(`$util.qr($QueryMap.put('${keys.join('+')}' , '${name}'))`),
    raw(`$util.qr($PkMap.put('${field.name.value}' , '${name}'))`),
    qref(methodCall(ref('SkMap.put'), str(name), list(sortKeyFields.map(str)))),
  );
  return block('Set query expression for @key', expressions);
};

/**
 * constructSyncVTL
 */
export const constructSyncVTL = (syncVTLContent: string, resolver: TransformerResolverProvider): void => {
  const checks = [
    print(generateSyncResolverInit()),
    syncVTLContent,
    print(setSyncQueryFilterSnippet()),
    print(setSyncKeyExpressionForHashKey(ResourceConstants.SNIPPETS.ModelQueryExpression)),
    print(setSyncKeyExpressionForRangeKey(ResourceConstants.SNIPPETS.ModelQueryExpression)),
    print(makeSyncQueryResolver()),
  ];

  addIndexToResolverSlot(resolver, checks, true);
};

/**
 * This function generates the VTL snippet to check whether a GSI/table can be queried to apply the sync filter.
 * The filter must enclosed in an 'and' condition.
 * { filter: { and: [ { genre: { eq: testSong.genre } } ] } }
 */
const setSyncQueryFilterSnippet = (): CompoundExpressionNode => {
  const expressions: Expression[] = [];
  expressions.push(
    compoundExpression([
      set(ref('filterArgsMap'), ref('ctx.args.filter.get("and")')),
      generateDeltaTableTTLCheck('isLastSyncInDeltaTTLWindow', 'ctx.args.lastSync'),
      ifElse(
        raw('!$util.isNullOrEmpty($filterArgsMap) && !$isLastSyncInDeltaTTLWindow'),
        compoundExpression([
          set(ref('json'), raw('$filterArgsMap')),
          forEach(ref('item'), ref('json'), [
            set(ref('ind'), ref('foreach.index')),
            forEach(ref('entry'), ref('item.entrySet()'), [
              iff(
                raw('$ind == 0 && !$util.isNullOrEmpty($entry.value.eq) && !$util.isNullOrEmpty($PkMap.get($entry.key))'),
                compoundExpression([
                  set(ref('pk'), ref('entry.key')),
                  set(ref('scan'), bool(false)),
                  set(ref('queryRequestVariables.partitionKey'), ref('pk')),
                  set(ref('queryRequestVariables.sortKeys'), ref('SkMap.get($PkMap.get($pk))')),
                  set(ref('queryRequestVariables.partitionKeyFilter'), obj({})),
                  raw("$util.qr($queryRequestVariables.partitionKeyFilter.put($pk, {'eq': $entry.value.eq}))"),
                  raw('$util.qr($ctx.args.put($pk,$entry.value.eq))'),
                  set(ref('index'), ref('PkMap.get($pk)')),
                ]),
              ),
              ifElse(
                // eslint-disable-next-line no-template-curly-in-string
                raw('$ind == 1 && !$util.isNullOrEmpty($pk) && !$util.isNullOrEmpty($QueryMap.get("${pk}+$entry.key"))'),
                compoundExpression([
                  set(ref('sk'), ref('entry.key')),
                  raw('$util.qr($ctx.args.put($sk,$entry.value))'),
                  // eslint-disable-next-line no-template-curly-in-string
                  set(ref('index'), ref('QueryMap.get("${pk}+$sk")')),
                ]),
                iff(raw('$ind > 0'), qref('$filterMap.put($entry.key,$entry.value)')),
              ),
            ]),
          ]),
        ]),
        set(ref('filterMap'), raw('$ctx.args.filter')),
      ),
    ]),
  );
  return block('Set query expression for @key', expressions);
};

const generateDeltaTableTTLCheck = (deltaTTLCheckRefName: string, lastSyncRefName: string): Expression => {
  return compoundExpression([
    set(ref(deltaTTLCheckRefName), bool(false)),
    set(ref('minLastSync'), raw('$util.time.nowEpochMilliSeconds() - $ctx.stash.deltaSyncTableTtl * 60 * 1000')),
    iff(
      and([
        not(methodCall(ref('util.isNull'), ref(lastSyncRefName))),
        notEquals(ref(lastSyncRefName), int(0)),
        raw(`$minLastSync <= $${lastSyncRefName}`),
      ]),
      set(ref(deltaTTLCheckRefName), bool(true)),
    ),
  ]);
};

const setSyncKeyExpressionForHashKey = (queryExprReference: string): CompoundExpressionNode => {
  const expressions: Expression[] = [];
  expressions.push(
    set(ref(ResourceConstants.SNIPPETS.ModelQueryExpression), obj({})),
    iff(
      raw('!$util.isNull($pk)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), str('#pk = :pk')),
        set(ref(`${queryExprReference}.expressionNames`), obj({ '#pk': str('$pk') })),
        set(
          ref(`${queryExprReference}.expressionValues`),
          obj({ ':pk': ref('util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($pk)))') }),
        ),
      ]),
    ),
  );
  return block('Set Primary Key initialization @key', expressions);
};

const setSyncKeyExpressionForRangeKey = (queryExprReference: string): CompoundExpressionNode => {
  return block('Applying Key Condition', [
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).beginsWith)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), raw(`"$${queryExprReference}.expression AND begins_with(#sortKey, :sortKey)"`)),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).beginsWith)))`,
        ),
      ]),
    ),
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).between)'),
      compoundExpression([
        set(
          ref(`${queryExprReference}.expression`),
          raw(`"$${queryExprReference}.expression AND #sortKey BETWEEN :sortKey0 AND :sortKey1"`),
        ),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).between[0])))`,
        ),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).between[1])))`,
        ),
      ]),
    ),
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).eq)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), raw(`"$${queryExprReference}.expression AND #sortKey = :sortKey"`)),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).eq)))`,
        ),
      ]),
    ),
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).lt)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), raw(`"$${queryExprReference}.expression AND #sortKey < :sortKey"`)),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).lt)))`,
        ),
      ]),
    ),
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).le)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), raw(`"$${queryExprReference}.expression AND #sortKey <= :sortKey"`)),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).le)))`,
        ),
      ]),
    ),
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).gt)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), raw(`"$${queryExprReference}.expression AND #sortKey > :sortKey"`)),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).gt)))`,
        ),
      ]),
    ),
    iff(
      raw('!$util.isNull($ctx.args.get($sk)) && !$util.isNull($ctx.args.get($sk).ge)'),
      compoundExpression([
        set(ref(`${queryExprReference}.expression`), raw(`"$${queryExprReference}.expression AND #sortKey >= :sortKey"`)),
        qref(`$${queryExprReference}.expressionNames.put("#sortKey", $sk)`),
        qref(
          `$${queryExprReference}.expressionValues.put(":sortKey", $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.get($sk).ge)))`,
        ),
      ]),
    ),
  ]);
};

const makeSyncQueryResolver = (): CompoundExpressionNode => {
  const requestVariable = 'ctx.stash.QueryRequest';
  const queryRequestVariables = 'ctx.stash.QueryRequestVariables';
  const expressions: Expression[] = [];
  expressions.push(
    iff(
      raw('!$scan'),
      compoundExpression([
        set(ref('limit'), ref(`util.defaultIfNull($context.args.limit, ${ResourceConstants.DEFAULT_PAGE_LIMIT})`)),
        set(ref(queryRequestVariables), ref('queryRequestVariables')),
        set(
          ref(requestVariable),
          obj({
            version: str(RESOLVER_VERSION_ID),
            operation: str('Sync'),
            limit: ref('limit'),
            lastSync: ref('util.defaultIfNull($ctx.args.lastSync, null)'),
            query: ref(ResourceConstants.SNIPPETS.ModelQueryExpression),
          }),
        ),
        ifElse(
          raw(`!$util.isNull($ctx.args.sortDirection)
                    && $ctx.args.sortDirection == "DESC"`),
          set(ref(`${requestVariable}.scanIndexForward`), bool(false)),
          set(ref(`${requestVariable}.scanIndexForward`), bool(true)),
        ),
        iff(ref('context.args.nextToken'), set(ref(`${requestVariable}.nextToken`), ref('context.args.nextToken')), true),
        iff(
          and([raw('!$util.isNullOrEmpty($filterMap)'), notEquals(toJson(ref('filterMap')), toJson(obj({})))]),
          set(ref(`${requestVariable}.filter`), ref('filterMap')),
        ),
        iff(raw('$index != "dbTable"'), set(ref(`${requestVariable}.index`), ref('index'))),
      ]),
    ),
    raw('$util.toJson({})'),
  );
  return block(' Set query expression for @key', expressions);
};

const generateSyncResolverInit = (): CompoundExpressionNode => {
  const expressions: Expression[] = [];
  const requestVariable = 'ctx.stash.QueryRequest';
  expressions.push(
    set(ref('index'), str('')),
    set(ref('scan'), bool(true)),
    set(ref('filterMap'), obj({})),
    set(ref('QueryMap'), obj({})),
    set(ref('PkMap'), obj({})),
    set(ref('SkMap'), obj({})),
    set(ref('filterArgsMap'), obj({})),
    iff(ref(requestVariable), raw('#return')),
    set(ref('queryRequestVariables'), obj({})),
  );
  return block('Set map initialization for @key', expressions);
};

/**
 * Util function to generate sandbox mode expression
 */
export const generateAuthExpressionForSandboxMode = (
  isSandboxModeEnabled: boolean,
  genericIamAccessEnabled: boolean | undefined,
): string => {
  const expressions: Array<Expression> = [];
  if (isSandboxModeEnabled) {
    expressions.push(iff(equals(methodCall(ref('util.authType')), str(API_KEY)), ret(toJson(obj({})))));
  }
  if (genericIamAccessEnabled) {
    const isNonCognitoIAMPrincipal = and([
      equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
    ]);
    expressions.push(iff(isNonCognitoIAMPrincipal, ret(toJson(obj({})))));
  }
  expressions.push(methodCall(ref('util.unauthorized')));

  return printBlock(`Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), compoundExpression(expressions)), toJson(obj({}))]),
  );
};

export const getVTLGenerator = (dbType: ModelDataSourceStrategyDbType | undefined): RDSIndexVTLGenerator | DynamoDBIndexVTLGenerator => {
  switch (dbType) {
    case DDB_DB_TYPE:
      return new DynamoDBIndexVTLGenerator();
    case MYSQL_DB_TYPE:
      return new RDSIndexVTLGenerator();
    case POSTGRES_DB_TYPE:
      return new RDSIndexVTLGenerator();
    default:
      throw new Error(`Unknown database type ${dbType}`);
  }
};
