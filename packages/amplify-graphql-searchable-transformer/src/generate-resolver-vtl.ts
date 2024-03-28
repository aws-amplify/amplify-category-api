/* eslint-disable no-template-curly-in-string */
import {
  SearchableMappingTemplate,
  print,
  str,
  ref,
  obj,
  set,
  iff,
  list,
  raw,
  forEach,
  compoundExpression,
  qref,
  toJson,
  ifElse,
  int,
  Expression,
  bool,
  methodCall,
  isNullOrEmpty,
  not,
  notEquals,
  printBlock,
  equals,
  ret,
  and,
} from 'graphql-mapping-template';
import { ResourceConstants, setArgs } from 'graphql-transformer-common';

const authFilter = ref('ctx.stash.authFilter');
const API_KEY = 'API Key Authorization';
const IAM_AUTH_TYPE = 'IAM Authorization';
const allowedAggFieldsList = 'allowedAggFields';

export const sandboxMappingTemplate = (
  isSandboxModeEnabled: boolean,
  genericIamAccessEnabled: boolean | undefined,
  fields: Array<string>,
): string => {
  const expressions: Array<Expression> = [];
  const ifAuthorizedExpression: Expression = compoundExpression([
    qref(methodCall(ref('ctx.stash.put'), str(allowedAggFieldsList), raw(JSON.stringify(fields)))),
    ret(toJson(obj({}))),
  ]);
  if (isSandboxModeEnabled) {
    expressions.push(iff(equals(methodCall(ref('util.authType')), str(API_KEY)), ifAuthorizedExpression));
  }
  if (genericIamAccessEnabled) {
    const isNonCognitoIAMPrincipal = and([
      equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
    ]);
    expressions.push(iff(isNonCognitoIAMPrincipal, ifAuthorizedExpression));
  }
  expressions.push(methodCall(ref('util.unauthorized')));

  return printBlock(`Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), compoundExpression(expressions)), toJson(obj({}))]),
  );
};

const getSourceMapper = (includeVersion: boolean): Expression[] => {
  if (includeVersion) {
    return [
      set(ref('row'), methodCall(ref('entry.get'), str('_source'))),
      qref('$row.put("_version", $entry.get("_version"))'),
      qref('$es_items.add($row)'),
    ];
  }
  return [qref('$es_items.add($entry.get("_source"))')];
};

export const requestTemplate = (
  primaryKey: string,
  nonKeywordFields: Expression[],
  includeVersion = false,
  indexName: string,
  keyFields: Expression[] = [],
): string =>
  print(
    compoundExpression([
      setArgs,
      set(ref('indexPath'), str(`/${indexName.toLowerCase()}/_search`)),
      set(ref('allowedAggFields'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.allowedAggFields'), list([]))),
      set(ref('aggFieldsFilterMap'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.aggFieldsFilterMap'), obj({}))),
      set(ref('nonKeywordFields'), list(nonKeywordFields)),
      set(ref('keyFields'), list(keyFields)),
      set(ref('sortValues'), list([])),
      set(ref('sortFields'), list([])),
      set(ref('aggregateValues'), obj({})),
      set(ref('primaryKey'), str(primaryKey)),
      iff(
        not(ref('util.isNullOrEmpty($args.sort)')),
        compoundExpression([
          // Sort based on the config passed on the request
          forEach(ref('sortItem'), ref('args.sort'), [
            ifElse(
              ref('util.isNullOrEmpty($sortItem.field)'),
              qref('$sortFields.add($primaryKey)'),
              qref('$sortFields.add($sortItem.field)'),
            ),
            ifElse(
              ref('util.isNullOrEmpty($sortItem.field)'),
              ifElse(
                ref('nonKeywordFields.contains($primaryKey)'),
                set(ref('sortField'), ref('util.toJson($primaryKey)')),
                set(ref('sortField'), ref('util.toJson("${primaryKey}.keyword")')),
              ),
              ifElse(
                ref('nonKeywordFields.contains($sortItem.field)'),
                set(ref('sortField'), ref('util.toJson($sortItem.field)')),
                set(ref('sortField'), ref('util.toJson("${sortItem.field}.keyword")')),
              ),
            ),
            ifElse(
              ref('util.isNullOrEmpty($sortItem.direction)'),
              set(ref('sortDirection'), ref('util.toJson({"order": "desc"})')),
              set(ref('sortDirection'), ref('util.toJson({"order": $sortItem.direction})')),
            ),
            qref('$sortValues.add("{$sortField: $sortDirection}")'),
          ]),
        ]),
      ),
      // Add the key field to sort if not included already
      forEach(ref('keyItem'), ref('keyFields'), [
        iff(
          not(ref('sortFields.contains($keyItem)')),
          compoundExpression([
            ifElse(
              ref('nonKeywordFields.contains($keyItem)'),
              set(ref('sortField'), ref('util.toJson($keyItem)')),
              set(ref('sortField'), ref('util.toJson("${keyItem}.keyword")')),
            ),
            set(ref('sortDirection'), ref('util.toJson({"order": "desc"})')),
            qref('$sortValues.add("{$sortField: $sortDirection}")'),
          ]),
        ),
      ]),
      forEach(ref('aggItem'), ref('args.aggregates'), [
        raw(
          '#if( $allowedAggFields.contains($aggItem.field) )\n' +
            '    #set( $aggFilter = { "match_all": {} } )\n' +
            '  #elseif( $aggFieldsFilterMap.containsKey($aggItem.field) )\n' +
            '    #set( $aggFilter = { "bool": { "should": $aggFieldsFilterMap.get($aggItem.field) } } )\n' +
            '  #else\n' +
            '    $util.error("Unauthorized to run aggregation on field: ${aggItem.field}", "Unauthorized")\n' +
            '  #end',
        ),
        generateAddAggregateValues(),
      ]),
      ifElse(
        not(isNullOrEmpty(authFilter)),
        compoundExpression([
          set(ref('filter'), authFilter),
          iff(
            not(isNullOrEmpty(ref('args.filter'))),
            set(
              ref('filter'),
              obj({
                bool: obj({
                  must: list([ref('ctx.stash.authFilter'), ref('util.parseJson($util.transform.toElasticsearchQueryDSL($args.filter))')]),
                }),
              }),
            ),
          ),
        ]),
        iff(
          not(isNullOrEmpty(ref('args.filter'))),
          set(ref('filter'), ref('util.parseJson($util.transform.toElasticsearchQueryDSL($args.filter))')),
        ),
      ),
      iff(isNullOrEmpty(ref('filter')), set(ref('filter'), obj({ match_all: obj({}) }))),
      SearchableMappingTemplate.searchTemplate({
        path: str('$indexPath'),
        size: ifElse(ref('args.limit'), ref('args.limit'), int(ResourceConstants.DEFAULT_SEARCHABLE_PAGE_LIMIT), true),
        search_after: ref('util.base64Decode($args.nextToken)'),
        from: ref('args.from'),
        version: bool(includeVersion),
        query: methodCall(ref('util.toJson'), ref('filter')),
        sort: ref('sortValues'),
        aggs: ref('util.toJson($aggregateValues)'),
      }),
    ]),
  );

export const generateAddAggregateValues = (): Expression => {
  return compoundExpression([
    set(ref('aggregateValue'), obj({})),
    qref('$aggregateValue.put("filter", $aggFilter)'),
    set(ref('aggsValue'), obj({})),
    set(ref('aggItemType'), obj({})),
    ifElse(
      ref('nonKeywordFields.contains($aggItem.field)'),
      qref('$aggItemType.put("$aggItem.type", { "field": "$aggItem.field" })'),
      qref('$aggItemType.put("$aggItem.type", { "field": "${aggItem.field}.keyword" })'),
    ),
    qref('$aggsValue.put("$aggItem.name", $aggItemType)'),
    qref('$aggregateValue.put("aggs", $aggsValue)'),
    qref('$aggregateValues.put("$aggItem.name", $aggregateValue)'),
  ]);
};

export const responseTemplate = (includeVersion = false): string =>
  print(
    compoundExpression([
      set(ref('es_items'), list([])),
      set(ref('aggregateValues'), list([])),
      forEach(ref('entry'), ref('context.result.hits.hits'), [
        iff(raw('!$foreach.hasNext'), set(ref('nextToken'), ref('util.base64Encode($util.toJson($entry.sort))'))),
        ...getSourceMapper(includeVersion),
      ]),
      forEach(ref('aggItem'), ref('context.result.aggregations.keySet()'), [
        set(ref('aggResult'), obj({})),
        set(ref('aggResultValue'), obj({})),
        set(ref('currentAggItem'), ref('ctx.result.aggregations.get($aggItem)')),
        qref('$aggResult.put("name", $aggItem)'),
        iff(
          raw('!$util.isNullOrEmpty($currentAggItem)'),
          compoundExpression([
            iff(
              raw('!$util.isNullOrEmpty($currentAggItem.get($aggItem).buckets)'),
              compoundExpression([
                qref('$aggResultValue.put("__typename", "SearchableAggregateBucketResult")'),
                qref('$aggResultValue.put("buckets", $currentAggItem.get($aggItem).buckets)'),
              ]),
            ),
            iff(
              raw('!$util.isNullOrEmpty($currentAggItem.get($aggItem).value)'),
              compoundExpression([
                qref('$aggResultValue.put("__typename", "SearchableAggregateScalarResult")'),
                qref('$aggResultValue.put("value", $currentAggItem.get($aggItem).value)'),
              ]),
            ),
          ]),
        ),
        qref('$aggResult.put("result", $aggResultValue)'),
        qref('$aggregateValues.add($aggResult)'),
      ]),
      toJson(
        obj({
          items: ref('es_items'),
          total: ref('ctx.result.hits.total.value'),
          nextToken: ref('nextToken'),
          aggregateItems: ref('aggregateValues'),
        }),
      ),
    ]),
  );
