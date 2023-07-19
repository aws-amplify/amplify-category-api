import {
  Expression,
  set,
  ref,
  obj,
  str,
  ifElse,
  compoundExpression,
  methodCall,
  qref,
  toJson,
  printBlock,
  iff,
  int,
  not,
  equals,
  bool,
  and,
  isNullOrEmpty,
  list,
  forEach,
  nul,
  raw,
} from 'graphql-mapping-template';
import { ResourceConstants, setArgs } from 'graphql-transformer-common';

const authFilter = ref('ctx.stash.authFilter');

/**
 * Generate get query resolver template
 */
export const generateGetRequestTemplate = (): string => {
  const statements: Expression[] = [
    set(ref('GetRequest'), obj({ version: str('2018-05-29'), operation: str('Query') })),
    ifElse(
      ref('ctx.stash.metadata.modelObjectKey'),
      compoundExpression([
        set(ref('expression'), str('')),
        set(ref('expressionNames'), obj({})),
        set(ref('expressionValues'), obj({})),
        forEach(ref('item'), ref('ctx.stash.metadata.modelObjectKey.entrySet()'), [
          set(ref('expression'), str('$expression#keyCount$velocityCount = :valueCount$velocityCount AND ')),
          qref(methodCall(ref('expressionNames.put'), str('#keyCount$velocityCount'), ref('item.key'))),
          qref(methodCall(ref('expressionValues.put'), str(':valueCount$velocityCount'), ref('item.value'))),
        ]),
        set(ref('expression'), methodCall(ref('expression.replaceAll'), str('AND $'), str(''))),
        set(
          ref('query'),
          obj({ expression: ref('expression'), expressionNames: ref('expressionNames'), expressionValues: ref('expressionValues') }),
        ),
      ]),
      set(
        ref('query'),
        obj({
          expression: str('id = :id'),
          expressionValues: obj({
            ':id': methodCall(ref('util.parseJson'), methodCall(ref('util.dynamodb.toDynamoDBJson'), ref('ctx.args.id'))),
          }),
        }),
      ),
    ),
    qref(methodCall(ref('GetRequest.put'), str('query'), ref('query'))),
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
  ];

  return printBlock('Get Request template')(compoundExpression(statements));
};

export const generateGetResponseTemplate = (isSyncEnabled: boolean): string => {
  const statements = new Array<Expression>();
  if (isSyncEnabled) {
    statements.push(
      iff(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'), ref('ctx.result'))),
    );
  } else {
    statements.push(iff(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'))));
  }
  statements.push(
    ifElse(
      and([not(ref('ctx.result.items.isEmpty()')), equals(ref('ctx.result.scannedCount'), int(1))]),
      toJson(ref('ctx.result.items[0]')),
      compoundExpression([
        iff(and([ref('ctx.result.items.isEmpty()'), equals(ref('ctx.result.scannedCount'), int(1))]), ref('util.unauthorized()')),
        toJson(nul()),
      ]),
    ),
  );
  return printBlock('Get Response template')(compoundExpression(statements));
};

export const generateListRequestTemplate = (): string => {
  const requestVariable = 'ListRequest';
  const modelQueryObj = 'ctx.stash.modelQueryExpression';
  const indexNameVariable = 'ctx.stash.metadata.index';
  const expression = compoundExpression([
    setArgs,
    set(ref('limit'), methodCall(ref(`util.defaultIfNull`), ref('args.limit'), int(100))),
    set(
      ref(requestVariable),
      obj({
        version: str('2018-05-29'),
        limit: ref('limit'),
      }),
    ),
    iff(ref('args.nextToken'), set(ref(`${requestVariable}.nextToken`), ref('args.nextToken'))),
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
          ref(`filterExpression`),
          methodCall(ref('util.parseJson'), methodCall(ref('util.transform.toDynamoDBFilterExpression'), ref('filter'))),
        ),
        iff(
          isNullOrEmpty(ref('filterExpression')),
          methodCall(ref('util.error'), str('Unable to process the filter expression'), str('Unrecognized Filter')),
        ),
        iff(
          not(methodCall(ref('util.isNullOrBlank'), ref('filterExpression.expression'))),
          compoundExpression([
            iff(
              equals(methodCall(ref('filterExpression.expressionValues.size')), int(0)),
              qref(methodCall(ref('filterExpression.remove'), str('expressionValues'))),
            ),
            set(ref(`${requestVariable}.filter`), ref(`filterExpression`)),
          ]),
        ),
      ]),
    ),
    ifElse(
      and([
        not(methodCall(ref('util.isNull'), ref(modelQueryObj))),
        not(methodCall(ref('util.isNullOrEmpty'), ref(`${modelQueryObj}.expression`))),
      ]),
      compoundExpression([
        qref(methodCall(ref(`${requestVariable}.put`), str('operation'), str('Query'))),
        qref(methodCall(ref(`${requestVariable}.put`), str('query'), ref(modelQueryObj))),
        ifElse(
          and([not(methodCall(ref('util.isNull'), ref('args.sortDirection'))), equals(ref('args.sortDirection'), str('DESC'))]),
          set(ref(`${requestVariable}.scanIndexForward`), bool(false)),
          set(ref(`${requestVariable}.scanIndexForward`), bool(true)),
        ),
      ]),
      qref(methodCall(ref(`${requestVariable}.put`), str('operation'), str('Scan'))),
    ),
    iff(not(methodCall(ref('util.isNull'), ref(indexNameVariable))), set(ref(`${requestVariable}.IndexName`), ref(indexNameVariable))),
    toJson(ref(requestVariable)),
  ]);
  return printBlock('List Request')(expression);
};

export const generateSyncRequestTemplate = (): string => {
  const requestVariable = 'ctx.stash.QueryRequest';
  return printBlock('Sync Request template')(
    compoundExpression([
      setArgs,
      set(ref('queryFilterContainsAuthField'), bool(false)),
      set(ref('authFilterContainsSortKey'), bool(false)),
      set(ref('useScan'), bool(true)),
      iff(and([isNullOrEmpty(authFilter), ref('ctx.stash.QueryRequest')]), set(ref('useScan'), bool(false))),
      ifElse(
        not(isNullOrEmpty(authFilter)),
        compoundExpression([
          set(ref('filter'), authFilter),
          iff(
            ref('ctx.stash.QueryRequestVariables.partitionKey'),
            compoundExpression([
              // Check if the auth filter contains the QueryRequest's partition key.
              // If yes, then the filter on auth field must match one of the Auth filter to perform a query.
              forEach(ref('filterItem'), ref('ctx.stash.authFilter.or'), [
                iff(
                  raw('$filterItem.get($ctx.stash.QueryRequestVariables.partitionKey)'),
                  set(ref('queryFilterContainsAuthField'), bool(true)),
                ),
              ]),
              ifElse(
                not(ref('queryFilterContainsAuthField')),
                // If the auth filter is not on an auth field, check if the QueryRequest's sort keys contain an auth field.
                // If yes, perform a scan. Otherwise, query the GSI/table.
                compoundExpression([
                  forEach(ref('filterItem'), ref('ctx.stash.authFilter.or'), [
                    forEach(ref('sortKey'), ref('ctx.stash.QueryRequestVariables.sortKeys'), [
                      iff(raw('$filterItem.get($sortKey)'), set(ref('authFilterContainsSortKey'), bool(true))),
                    ]),
                  ]),
                  iff(
                    not(ref('authFilterContainsSortKey')),
                    compoundExpression([
                      ifElse(
                        not(isNullOrEmpty(ref(`${requestVariable}.filter`))),
                        set(ref(`${requestVariable}.filter`), obj({ and: list([ref(`${requestVariable}.filter`), authFilter]) })),
                        set(ref(`${requestVariable}.filter`), authFilter),
                      ),
                      set(ref('useScan'), bool(false)),
                    ]),
                  ),
                ]),
                compoundExpression([
                  forEach(ref('filterItem'), ref('ctx.stash.authFilter.or'), [
                    iff(
                      raw('$util.toJson($filterItem) == $util.toJson($ctx.stash.QueryRequestVariables.partitionKeyFilter)'),
                      set(ref('useScan'), bool(false)),
                    ),
                  ]),
                ]),
              ),
            ]),
          ),
          iff(not(isNullOrEmpty(ref('args.filter'))), set(ref('filter'), obj({ and: list([ref('filter'), ref('args.filter')]) }))),
        ]),
        iff(not(isNullOrEmpty(ref('args.filter'))), set(ref('filter'), ref('args.filter'))),
      ),
      iff(
        not(isNullOrEmpty(ref('filter'))),
        compoundExpression([
          set(
            ref(`filterExpression`),
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
      ifElse(
        not(ref('useScan')),
        compoundExpression([
          iff(
            ref(`${requestVariable}.filter`),
            set(
              ref(`${requestVariable}.filter`),
              methodCall(
                ref('util.parseJson'),
                methodCall(ref('util.transform.toDynamoDBFilterExpression'), ref(`${requestVariable}.filter`)),
              ),
            ),
          ),
          raw(`$util.toJson($${requestVariable})`),
        ]),
        obj({
          version: str('2018-05-29'),
          operation: str('Sync'),
          filter: ifElse(ref('filter'), ref('util.toJson($filter)'), nul()),
          limit: ref(`util.defaultIfNull($args.limit, ${ResourceConstants.DEFAULT_SYNC_QUERY_PAGE_LIMIT})`),
          lastSync: ref('util.toJson($util.defaultIfNull($args.lastSync, null))'),
          nextToken: ref('util.toJson($util.defaultIfNull($args.nextToken, null))'),
        }),
      ),
    ]),
  );
};
