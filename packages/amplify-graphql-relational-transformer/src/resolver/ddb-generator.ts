import { MappingTemplate, getModelDataSourceNameForTypeName, getKeySchema, getTable } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DynamoDBMappingTemplate,
  Expression,
  ObjectNode,
  and,
  bool,
  compoundExpression,
  equals,
  ifElse,
  iff,
  int,
  isNullOrEmpty,
  list,
  methodCall,
  not,
  nul,
  obj,
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
  ModelResourceIDs,
  NONE_VALUE,
  ResolverResourceIDs,
  applyCompositeKeyConditionExpression,
  applyKeyConditionExpression,
  attributeTypeFromScalar,
  setArgs,
  toCamelCase,
} from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode } from 'graphql';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from '../types';
import { condenseRangeKey } from '../resolvers';
import { RelationalResolverGenerator } from './generator';

const SORT_KEY_VALUE = 'sortKeyValue';
const CONNECTION_STACK = 'ConnectionStack';
const authFilter = ref('ctx.stash.authFilter');
const PARTITION_KEY_VALUE = 'partitionKeyValue';

export class DDBRelationalResolverGenerator extends RelationalResolverGenerator {
  makeExpression = (keySchema: any[], connectionAttributes: string[]): ObjectNode => {
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
          ':sortKey': ref(`util.dynamodb.toDynamoDB(${condensedSortKeyValue ? `"${condensedSortKeyValue}"` : `$${SORT_KEY_VALUE}0`})`),
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
  };

  /**
   * Create a resolver that queries an item in DynamoDB.
   * @param config The connection directive configuration.
   * @param ctx The transformer context provider.
   */
  makeHasManyGetItemsConnectionWithKeyResolver = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    const { connectionFields, field, fields, indexName, limit, object, relatedType } = config;
    const connectionAttributes: string[] = fields.length > 0 ? fields : connectionFields;
    if (connectionAttributes.length === 0) {
      throw new Error('Either connection fields or local fields should be populated.');
    }
    const table = getTable(ctx, relatedType);
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const keySchema = getKeySchema(table, indexName);
    const setup: Expression[] = [
      set(ref('limit'), ref(`util.defaultIfNull($context.args.limit, ${limit})`)),
      ...connectionAttributes
        .slice(1)
        .map((ca, idx) =>
          set(
            ref(`${SORT_KEY_VALUE}${idx}`),
            methodCall(ref('util.defaultIfNull'), ref(`ctx.stash.connectionAttibutes.get("${ca}")`), ref(`ctx.source.${ca}`)),
          ),
        ),
      set(ref('query'), this.makeExpression(keySchema, connectionAttributes)),
    ];

    // If the key schema has a sort key but one is not provided for the query, let a sort key be
    // passed in via $ctx.args.
    if (keySchema[1] && !connectionAttributes[1]) {
      const sortKeyFieldName = keySchema[1].attributeName;
      const sortKeyField = relatedType.fields!.find((f) => f.name.value === sortKeyFieldName);

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
                ref('util.defaultIfNull'),
                ref(`ctx.stash.connectionAttributes.get("${connectionAttributes[0]}")`),
                ref(`ctx.source.${connectionAttributes[0]}`),
              ),
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

    resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  /**
   * Create a get item resolver for singular connections.
   * @param config The connection directive configuration.
   * @param ctx The transformer context provider.
   */
  makeHasOneGetItemConnectionWithKeyResolver = (config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    this.makeHasOneBelongToGetItemConnectionWithKeyResolver(config, ctx);
  };

  makeBelongsToGetItemConnectionWithKeyResolver = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    this.makeHasOneBelongToGetItemConnectionWithKeyResolver(config, ctx);
  };

  makeHasOneBelongToGetItemConnectionWithKeyResolver = (
    config: HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
    ctx: TransformerContextProvider,
  ): void => {
    const { connectionFields, field, fields, object, relatedType, relatedTypeIndex } = config;
    if (relatedTypeIndex.length === 0) {
      throw new Error('Expected relatedType index fields to be set for connection.');
    }
    const localFields = fields.length > 0 ? fields : connectionFields;
    const table = getTable(ctx, relatedType);
    const { keySchema } = table as any;
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const partitionKeyName = keySchema[0].attributeName;
    const totalExpressions = ['#partitionKey = :partitionValue'];
    const totalExpressionNames: Record<string, Expression> = {
      '#partitionKey': str(partitionKeyName),
    };

    const totalExpressionValues: Record<string, Expression> = {
      ':partitionValue': this.buildKeyValueExpression(localFields[0], ctx.output.getObject(object.name.value)!, true),
    };

    // Add a composite sort key or simple sort key if there is one.
    if (relatedTypeIndex.length > 2) {
      const rangeKeyFields = localFields.slice(1);
      const sortKeyName = keySchema[1].attributeName;
      const condensedSortKeyValue = condenseRangeKey(rangeKeyFields.map((keyField) => `\${ctx.source.${keyField}}`));

      totalExpressions.push('#sortKeyName = :sortKeyName');
      totalExpressionNames['#sortKeyName'] = str(sortKeyName);
      totalExpressionValues[':sortKeyName'] = ref(
        `util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank("${condensedSortKeyValue}", "${NONE_VALUE}")))`,
      );
    } else if (relatedTypeIndex.length === 2) {
      const sortKeyName = keySchema[1].attributeName;
      totalExpressions.push('#sortKeyName = :sortKeyName');
      totalExpressionNames['#sortKeyName'] = str(sortKeyName);
      totalExpressionValues[':sortKeyName'] = this.buildKeyValueExpression(localFields[1], ctx.output.getObject(object.name.value)!);
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
                ref('util.defaultIfNull'),
                ref(`ctx.stash.connectionAttibutes.get("${localFields[0]}")`),
                ref(`ctx.source.${localFields[0]}`),
              ),
            ),
            ifElse(
              or([
                methodCall(ref('util.isNull'), ref(PARTITION_KEY_VALUE)),
                ...localFields.slice(1).map((f) => raw(`$util.isNull($ctx.source.${f})`)),
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

    resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  buildKeyValueExpression = (fieldName: string, object: ObjectTypeDefinitionNode, isPartitionKey = false): Expression => {
    const field = object.fields?.find((it) => it.name.value === fieldName);

    // can be auto-generated
    const attributeType = field ? attributeTypeFromScalar(field.type) : 'S';

    return ref(
      `util.parseJson($util.dynamodb.toDynamoDBJson($util.${attributeType === 'S' ? 'defaultIfNullOrBlank' : 'defaultIfNull'}(${
        isPartitionKey ? `$${PARTITION_KEY_VALUE}` : `$ctx.source.${fieldName}`
      }, "${NONE_VALUE}")))`,
    );
  };
}
