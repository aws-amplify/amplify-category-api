import {
  InvalidDirectiveError,
  MappingTemplate,
  getModelDataSourceNameForTypeName,
  getPrimaryKeyFields,
  getTable,
} from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DynamoDBMappingTemplate,
  Expression,
  ObjectNode,
  and,
  bool,
  compoundExpression,
  equals,
  forEach,
  greaterThan,
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
import { ModelResourceIDs, NONE_VALUE, ResolverResourceIDs, setArgs } from 'graphql-transformer-common';
import { OPERATION_KEY } from '@aws-amplify/graphql-model-transformer';
import { condenseRangeKey } from '../resolvers';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from '../types';
import { DDBRelationalResolverGenerator } from './ddb-generator';

const SORT_KEY_VALUE = 'sortKeyValue';
const CONNECTION_STACK = 'ConnectionStack';
const authFilter = ref('ctx.stash.authFilter');
const PARTITION_KEY_VALUE = 'partitionKeyValue';

export class DDBRelationalReferencesResolverGenerator extends DDBRelationalResolverGenerator {
  makeQueryExpression = (references: string[]): ObjectNode => {
    if (references.length > 1) {
      const rangeKeyFields = references.slice(1);
      const condensedSortKeyName = condenseRangeKey(rangeKeyFields);
      // This is the format that used by `makeHasManyGetItemsConnectionWithKeyResolver`
      // to define the sortkeys values for the relationship GSI (assigned to the Primary model's primarykey's sortkeys)
      // `sortKeyValue0`, `sortKeyValue1`,`sortKeyValueN` e.g.
      // #set( $sortKeyValue0 = <pk sk 0>
      // #set( $sortKeyValue1 = <pk sk 1>
      // These variables are then used in the query object as
      // ":sortKey": $util.dynamodb.toDynamoDB("${sortKeyValue0}#${sortKeyValue1}"")
      const condensedSortKeyValue =
        rangeKeyFields.length === 1
          ? `$${SORT_KEY_VALUE}0`
          : `"${rangeKeyFields.map((key, idx) => `\${${SORT_KEY_VALUE}${idx}}`).join(ModelResourceIDs.ModelCompositeKeySeparator())}"`;

      return obj({
        expression: str('#partitionKey = :partitionKey AND #sortKey = :sortKey'),
        expressionNames: obj({
          '#partitionKey': str(references[0]),
          '#sortKey': str(condensedSortKeyName),
        }),
        expressionValues: obj({
          ':partitionKey': ref(`util.dynamodb.toDynamoDB($${PARTITION_KEY_VALUE})`),
          ':sortKey': ref(`util.dynamodb.toDynamoDB(${condensedSortKeyValue})`),
        }),
      });
    }

    return obj({
      expression: str('#partitionKey = :partitionKey'),
      expressionNames: obj({
        '#partitionKey': str(references[0]),
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
    const { field, indexName, limit, object, references, relatedType } = config;

    if (references.length < 1) {
      // If references is empty at this point, something has gone horribly wrong. Time to bail.
      throw new InvalidDirectiveError(`Expected references for @${config.directiveName} on ${object.name.value}.${field.name.value}`);
    }

    const primaryKeyFields: string[] = getPrimaryKeyFields(object);
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const setup: Expression[] = [
      set(ref('limit'), ref(`util.defaultIfNull($context.args.limit, ${limit})`)),
      ...primaryKeyFields
        .slice(1)
        .map((ca, idx) =>
          set(
            ref(`${SORT_KEY_VALUE}${idx}`),
            methodCall(ref('util.defaultIfNull'), ref(`ctx.stash.connectionAttibutes.get("${ca}")`), ref(`ctx.source.${ca}`)),
          ),
        ),
      set(ref('query'), this.makeQueryExpression(references)),
    ];

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
            iff(ref('ctx.stash.deniedField'), compoundExpression([set(ref('result'), obj({ items: list([]) })), raw('#return($result)')])),
            set(
              ref(PARTITION_KEY_VALUE),
              methodCall(
                ref('util.defaultIfNull'),
                ref(`ctx.stash.connectionAttributes.get("${primaryKeyFields[0]}")`),
                ref(`ctx.source.${primaryKeyFields[0]}`),
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
            compoundExpression([
              iff(raw('!$result'), set(ref('result'), ref('ctx.result'))),
              // Make sure each retrieved item has the __operation field, so the individual type resolver can appropriately redact fields
              compoundExpression([
                iff(
                  equals(
                    methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul()),
                    str('Mutation'),
                  ),
                  forEach(ref('item'), ref('result.items'), [qref(methodCall(ref('item.put'), str(OPERATION_KEY), str('Mutation')))]),
                ),
                raw('$util.toJson($result)'),
              ]),
            ]),
          ),
        ),
        `${object.name.value}.${field.name.value}.res.vtl`,
      ),
    );

    resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  makeHasOneGetItemConnectionWithKeyResolver = (config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    const { field, indexName, references, object, relatedType } = config;
    if (references.length < 1) {
      // If references is empty at this point, something has gone horribly wrong. Time to bail.
      throw new InvalidDirectiveError(`Expected references for @${config.directiveName} on ${object.name.value}.${field.name.value}`);
    }
    const primaryKeyFields: string[] = getPrimaryKeyFields(object);
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const partitionKeyName = references[0];
    const totalExpressions = ['#partitionKey = :partitionValue'];
    const totalExpressionNames: Record<string, Expression> = {
      '#partitionKey': str(partitionKeyName),
    };

    const totalExpressionValues: Record<string, Expression> = {
      ':partitionValue': this.buildKeyValueExpression(references[0], relatedType, true),
    };

    if (references.length > 2) {
      const rangeKeyFields = references.slice(1);
      const sortKeyName = condenseRangeKey(rangeKeyFields);
      const condensedSortKeyValue = condenseRangeKey(primaryKeyFields.slice(1).map((keyField) => `\${ctx.source.${keyField}}`));

      totalExpressions.push('#sortKeyName = :sortKeyName');
      totalExpressionNames['#sortKeyName'] = str(sortKeyName);
      totalExpressionValues[':sortKeyName'] = ref(
        `util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank("${condensedSortKeyValue}", "${NONE_VALUE}")))`,
      );
    } else if (references.length === 2) {
      const sortKeyName = references[1];
      totalExpressions.push('#sortKeyName = :sortKeyName');
      totalExpressionNames['#sortKeyName'] = str(sortKeyName);
      totalExpressionValues[':sortKeyName'] = this.buildKeyValueExpression(primaryKeyFields[1], ctx.output.getObject(object.name.value)!);
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
                ref(`ctx.stash.connectionAttibutes.get("${primaryKeyFields[0]}")`),
                ref(`ctx.source.${primaryKeyFields[0]}`),
              ),
            ),
            ifElse(
              or([
                methodCall(ref('util.isNull'), ref(PARTITION_KEY_VALUE)),
                ...primaryKeyFields.slice(1).map((f) => raw(`$util.isNull($ctx.source.${f})`)),
              ]),
              raw('#return'),
              compoundExpression([
                set(ref('GetRequest'), obj({ version: str('2018-05-29'), operation: str('Query'), index: str(indexName) })),
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
              not(ref('ctx.result.items.isEmpty()')),
              // Make sure the retrieved item has the __operation field, so the individual type resolver can appropriately redact fields
              compoundExpression([
                set(ref('resultValue'), ref('ctx.result.items[0]')),
                set(ref('operation'), methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul())),
                iff(
                  equals(ref('operation'), str('Mutation')),
                  qref(methodCall(ref('resultValue.put'), str(OPERATION_KEY), str('Mutation'))),
                ),
                toJson(ref('resultValue')),
              ]),
              compoundExpression([
                iff(
                  and([ref('ctx.result.items.isEmpty()'), greaterThan(ref('ctx.result.scannedCount'), int(0))]),
                  ref('util.unauthorized()'),
                ),
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

  /**
   * Create a get item resolver for singular connections.
   * @param config The connection directive configuration.
   * @param ctx The transformer context provider.
   */
  makeBelongsToGetItemConnectionWithKeyResolver = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    const { field, references, object, relatedType } = config;
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
      ':partitionValue': this.buildKeyValueExpression(references[0], ctx.output.getObject(object.name.value)!, true),
    };

    // Add a composite sort key or simple sort key if there is one.
    if (references.length > 2) {
      const rangeKeyFields = references.slice(1);
      const sortKeyName = keySchema[1].attributeName;
      const condensedSortKeyValue = condenseRangeKey(rangeKeyFields.map((keyField) => `\${ctx.source.${keyField}}`));

      totalExpressions.push('#sortKeyName = :sortKeyName');
      totalExpressionNames['#sortKeyName'] = str(sortKeyName);
      totalExpressionValues[':sortKeyName'] = ref(
        `util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank("${condensedSortKeyValue}", "${NONE_VALUE}")))`,
      );
    } else if (references.length === 2) {
      const sortKeyName = keySchema[1].attributeName;
      totalExpressions.push('#sortKeyName = :sortKeyName');
      totalExpressionNames['#sortKeyName'] = str(sortKeyName);
      totalExpressionValues[':sortKeyName'] = this.buildKeyValueExpression(references[1], ctx.output.getObject(object.name.value)!);
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
                ref(`ctx.stash.connectionAttibutes.get("${references[0]}")`),
                ref(`ctx.source.${references[0]}`),
              ),
            ),
            ifElse(
              or([
                methodCall(ref('util.isNull'), ref(PARTITION_KEY_VALUE)),
                ...references.slice(1).map((f) => raw(`$util.isNull($ctx.source.${f})`)),
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
              // Make sure the retrieved item has the __operation field, so the individual type resolver can appropriately redact fields
              compoundExpression([
                set(ref('resultValue'), ref('ctx.result.items[0]')),
                set(ref('operation'), methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul())),
                iff(
                  equals(ref('operation'), str('Mutation')),
                  qref(methodCall(ref('resultValue.put'), str(OPERATION_KEY), str('Mutation'))),
                ),
                toJson(ref('resultValue')),
              ]),
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
}
