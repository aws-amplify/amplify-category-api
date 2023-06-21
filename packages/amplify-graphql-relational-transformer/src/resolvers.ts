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

function buildKeyValueExpression(fieldName: string, object: ObjectTypeDefinitionNode, isPartitionKey: boolean = false) {
  const field = object.fields?.find(it => it.name.value === fieldName);

  // can be auto-generated
  const attributeType = field ? attributeTypeFromScalar(field.type) : 'S';

  return ref(
    `util.parseJson($util.dynamodb.toDynamoDBJson($util.${
      attributeType === 'S' ? 'defaultIfNullOrBlank' : 'defaultIfNull'
    }(${isPartitionKey ?  `$${PARTITION_KEY_VALUE}` : `$ctx.source.${fieldName}`}, "${NONE_VALUE}")))`,
  );
}

/**
 * Create a get item resolver for singular connections.
 * @param config The connection directive configuration.
 * @param ctx The transformer context provider.
 */
export function makeGetItemConnectionWithKeyResolver(config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider) {
  const {
    connectionFields, field, fields, object, relatedType, relatedTypeIndex,
  } = config;
  if (relatedTypeIndex.length === 0) {
    throw new Error('Expected relatedType index fields to be set for connection.');
  }
  const localFields = fields.length > 0 ? fields : connectionFields;
  const table = getTable(ctx, relatedType);
  const { keySchema } = table as any;
  const dataSource = ctx.api.host.getDataSource(`${relatedType.name.value}Table`);
  const partitionKeyName = keySchema[0].attributeName;
  const totalExpressions = ['#partitionKey = :partitionValue'];
  const totalExpressionNames: Record<string, Expression> = {
    '#partitionKey': str(partitionKeyName),
  };

  const totalExpressionValues: Record<string, Expression> = {
    ':partitionValue': buildKeyValueExpression(localFields[0], ctx.output.getObject(object.name.value)!, true),
  };

  // Add a composite sort key or simple sort key if there is one.
  if (relatedTypeIndex.length > 2) {
    const rangeKeyFields = localFields.slice(1);
    const sortKeyName = keySchema[1].attributeName;
    const condensedSortKeyValue = condenseRangeKey(rangeKeyFields.map(keyField => `\${ctx.source.${keyField}}`));

    totalExpressions.push('#sortKeyName = :sortKeyName');
    totalExpressionNames['#sortKeyName'] = str(sortKeyName);
    totalExpressionValues[':sortKeyName'] = ref(
      `util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank("${condensedSortKeyValue}", "${NONE_VALUE}")))`,
    );
  } else if (relatedTypeIndex.length === 2) {
    const sortKeyName = keySchema[1].attributeName;
    totalExpressions.push('#sortKeyName = :sortKeyName');
    totalExpressionNames['#sortKeyName'] = str(sortKeyName);
    totalExpressionValues[':sortKeyName'] = buildKeyValueExpression(localFields[1], ctx.output.getObject(object.name.value)!);
  }

  const resolverResourceId = ResolverResourceIDs.ResolverResourceID(object.name.value, field.name.value);
  const resolver = ctx.resolvers.generateQueryResolver(
    object.name.value,
    field.name.value,
    resolverResourceId,
    dataSource as any,
    MappingTemplate.s3MappingTemplateFromString(
      print(
        compoundExpression([
          iff(ref('ctx.stash.deniedField'), raw('#return($util.toJson(null))')),
          set(
            ref(PARTITION_KEY_VALUE),
            methodCall(
              ref(`util.defaultIfNull`),
              ref(`ctx.stash.connectionAttibutes.get("${localFields[0]}")`),
              ref(`ctx.source.${localFields[0]}`)
            )
          ),
          ifElse(
            or([
              methodCall(ref('util.isNull'), ref(PARTITION_KEY_VALUE)),
              ...localFields.slice(1).map(f => raw(`$util.isNull($ctx.source.${f})`))
            ]),
            raw('#return'),
            compoundExpression([
              set(ref('GetRequest'), obj({ version: str('2018-05-29'), operation: str('Query') })),
              qref(
                methodCall(
                  ref('GetRequest.put'),
                  str('query'),
                  obj({
                    expression: str(totalExpressions.join(' AND ')),
                    expressionNames: obj(totalExpressionNames),
                    expressionValues: obj(totalExpressionValues),
                  }),
                ),
              ),
              iff(
                not(isNullOrEmpty(authFilter)),
                qref(
                  methodCall(
                    ref('GetRequest.put'),
                    str('filter'),
                    methodCall(ref('util.parseJson'), methodCall(ref('util.transform.toDynamoDBFilterExpression'), authFilter)),
                  ),
                ),
              ),
              toJson(ref('GetRequest')),
            ]),
          ),
        ]),
      ),
      `${object.name.value}.${field.name.value}.req.vtl`,
    ),
    MappingTemplate.s3MappingTemplateFromString(
      print(
        DynamoDBMappingTemplate.dynamoDBResponse(
          false,
          ifElse(
            and([not(ref('ctx.result.items.isEmpty()')), equals(ref('ctx.result.scannedCount'), int(1))]),
            toJson(ref('ctx.result.items[0]')),
            compoundExpression([
              iff(and([ref('ctx.result.items.isEmpty()'), equals(ref('ctx.result.scannedCount'), int(1))]), ref('util.unauthorized()')),
              toJson(nul()),
            ]),
          ),
        ),
      ),
      `${object.name.value}.${field.name.value}.res.vtl`,
    ),
  );

  resolver.mapToStack(ctx.stackManager.getStackFor(resolverResourceId, CONNECTION_STACK));
  ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
}

/**
 * Create a resolver that queries an item in DynamoDB.
 * @param config The connection directive configuration.
 * @param ctx The transformer context provider.
 */
export function makeQueryConnectionWithKeyResolver(config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider) {
  const {
    connectionFields, field, fields, indexName, limit, object, relatedType,
  } = config;
  const connectionAttributes: string[] = fields.length > 0 ? fields : connectionFields;
  if (connectionAttributes.length === 0) {
    throw new Error('Either connection fields or local fields should be populated.');
  }
  const table = getTable(ctx, relatedType);
  const dataSource = ctx.api.host.getDataSource(`${relatedType.name.value}Table`);
  const keySchema = getKeySchema(table, indexName);
  const setup: Expression[] = [
    set(ref('limit'), ref(`util.defaultIfNull($context.args.limit, ${limit})`)),
    ...connectionAttributes.slice(1).map((ca, idx) => set(ref(`${SORT_KEY_VALUE}${idx}`), methodCall(
      ref(`util.defaultIfNull`),
      ref(`ctx.stash.connectionAttibutes.get("${ca}")`),
      ref(`ctx.source.${ca}`)
    ))),
    set(ref('query'), makeExpression(keySchema, connectionAttributes)),
  ];

  // If the key schema has a sort key but one is not provided for the query, let a sort key be
  // passed in via $ctx.args.
  if (keySchema[1] && !connectionAttributes[1]) {
    const sortKeyFieldName = keySchema[1].attributeName;
    const sortKeyField = relatedType.fields!.find(f => f.name.value === sortKeyFieldName);

    if (sortKeyField) {
      setup.push(applyKeyConditionExpression(sortKeyFieldName, attributeTypeFromScalar(sortKeyField.type), 'query'));
    } else {
      const sortKeyFieldNames = sortKeyFieldName.split(ModelResourceIDs.ModelCompositeKeySeparator());

      setup.push(applyCompositeKeyConditionExpression(sortKeyFieldNames, 'query', toCamelCase(sortKeyFieldNames), sortKeyFieldName));
    }
  }
  // add setup filter to query
  setup.push(
    setArgs,
    ifElse(
      not(isNullOrEmpty(authFilter)),
      compoundExpression([
        set(ref('filter'), authFilter),
        iff(not(isNullOrEmpty(ref('args.filter'))), set(ref('filter'), obj({ and: list([ref('filter'), ref('args.filter')]) }))),
      ]),
      iff(not(isNullOrEmpty(ref('args.filter'))), set(ref('filter'), ref('args.filter'))),
    ),
    iff(
      not(isNullOrEmpty(ref('filter'))),
      compoundExpression([
        set(
          ref('filterExpression'),
          methodCall(ref('util.parseJson'), methodCall(ref('util.transform.toDynamoDBFilterExpression'), ref('filter'))),
        ),
        iff(
          not(methodCall(ref('util.isNullOrBlank'), ref('filterExpression.expression'))),
          compoundExpression([
            iff(
              equals(methodCall(ref('filterExpression.expressionValues.size')), int(0)),
              qref(methodCall(ref('filterExpression.remove'), str('expressionValues'))),
            ),
            set(ref('filter'), ref('filterExpression')),
          ]),
        ),
      ]),
    ),
  );

  const queryArguments = {
    query: raw('$util.toJson($query)'),
    scanIndexForward: ifElse(
      ref('context.args.sortDirection'),
      ifElse(equals(ref('context.args.sortDirection'), str('ASC')), bool(true), bool(false)),
      bool(true),
    ),
    filter: ifElse(ref('filter'), ref('util.toJson($filter)'), nul()),
    limit: ref('limit'),
    nextToken: ifElse(ref('context.args.nextToken'), ref('util.toJson($context.args.nextToken)'), nul()),
  } as any;

  if (indexName) {
    queryArguments.index = str(indexName);
  }

  const queryObj = DynamoDBMappingTemplate.query(queryArguments);
  const resolverResourceId = ResolverResourceIDs.ResolverResourceID(object.name.value, field.name.value);
  const resolver = ctx.resolvers.generateQueryResolver(
    object.name.value,
    field.name.value,
    resolverResourceId,
    dataSource as any,
    MappingTemplate.s3MappingTemplateFromString(
      print(
        compoundExpression([
          iff(ref('ctx.stash.deniedField'), raw('#return($util.toJson(null))')),
          set(
            ref(PARTITION_KEY_VALUE),
            methodCall(
              ref(`util.defaultIfNull`),
              ref(`ctx.stash.connectionAttributes.get("${connectionAttributes[0]}")`),
              ref(`ctx.source.${connectionAttributes[0]}`)
            )
          ),
          ifElse(
            methodCall(ref('util.isNull'), ref(PARTITION_KEY_VALUE)),
            compoundExpression([set(ref('result'), obj({ items: list([]) })), raw('#return($result)')]),
            compoundExpression([...setup, queryObj]),
          ),
        ]),
      ),
      `${object.name.value}.${field.name.value}.req.vtl`,
    ),
    MappingTemplate.s3MappingTemplateFromString(
      print(
        DynamoDBMappingTemplate.dynamoDBResponse(
          false,
          compoundExpression([iff(raw('!$result'), set(ref('result'), ref('ctx.result'))), raw('$util.toJson($result)')]),
        ),
      ),
      `${object.name.value}.${field.name.value}.res.vtl`,
    ),
  );

  resolver.mapToStack(ctx.stackManager.getStackFor(resolverResourceId, CONNECTION_STACK));
  ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
}

function makeExpression(keySchema: any[], connectionAttributes: string[]): ObjectNode {
  if (keySchema[1] && connectionAttributes[1]) {
    let condensedSortKeyValue;

    if (connectionAttributes.length > 2) {
      const rangeKeyFields = connectionAttributes.slice(1);

      condensedSortKeyValue = rangeKeyFields
        .map((keyField, idx) => `\${${SORT_KEY_VALUE}${idx}}`)
        .join(ModelResourceIDs.ModelCompositeKeySeparator());
    }

    return obj({
      expression: str('#partitionKey = :partitionKey AND #sortKey = :sortKey'),
      expressionNames: obj({
        '#partitionKey': str(keySchema[0].attributeName),
        '#sortKey': str(keySchema[1].attributeName),
      }),
      expressionValues: obj({
        ':partitionKey': ref(`util.dynamodb.toDynamoDB($${PARTITION_KEY_VALUE})`),
        ':sortKey': ref(
          `util.dynamodb.toDynamoDB(${
            condensedSortKeyValue ? `"${condensedSortKeyValue}"` : `$${SORT_KEY_VALUE}0`
          })`,
        ),
      }),
    });
  }

  return obj({
    expression: str('#partitionKey = :partitionKey'),
    expressionNames: obj({
      '#partitionKey': str(keySchema[0].attributeName),
    }),
    expressionValues: obj({
      ':partitionKey': ref(`util.dynamodb.toDynamoDB($${PARTITION_KEY_VALUE})`),
    }),
  });
}

function condenseRangeKey(fields: string[]): string {
  return fields.join(ModelResourceIDs.ModelCompositeKeySeparator());
}

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
  const partitionKeyName = getConnectionAttributeName(ctx.transformParameters, mappedObjectName, field.name.value, getObjectPrimaryKey(object).name.value);
  const partitionKeyType = respectPrimaryKeyAttributesOnConnectionField ? attributeTypeFromType(getObjectPrimaryKey(object).type, ctx) : 'S';
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
}

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
  const connectedSortKeyFieldNames: string[] = sortKeyFields.map(sortKeyField =>
    getConnectionAttributeName(ctx.transformParameters, mappedObjectName, hasManyField.name.value, sortKeyField.name.value));
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
