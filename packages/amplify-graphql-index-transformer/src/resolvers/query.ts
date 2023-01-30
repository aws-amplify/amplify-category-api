import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { DataSourceProvider, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  bool,
  compoundExpression, equals, ifElse,
  iff,
  int,
  isNullOrEmpty,
  list,
  methodCall, not,
  obj,
  print, printBlock, qref,
  raw,
  ref,
  RESOLVER_VERSION_ID,
  set,
  str
} from 'graphql-mapping-template';
import {
  ResolverResourceIDs,
  ResourceConstants
} from 'graphql-transformer-common';
import { IndexDirectiveConfiguration } from '../types';
import { getTable, generateAuthExpressionForSandboxMode, setQuerySnippet, getDBType } from "./common";

export function makeQueryResolver(config: IndexDirectiveConfiguration, ctx: TransformerContextProvider) {
  const { name, object, queryField } = config;
  if (!(name && queryField)) {
    throw new Error('Expected name and queryField to be defined while generating resolver.');
  }
  const dataSourceName = `${object.name.value}Table`;
  const dataSource = ctx.api.host.getDataSource(dataSourceName);
  const queryTypeName = ctx.output.getQueryTypeName() as string;
  const table = getTable(ctx, object);
  
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
      makeQueryRequestMappingTemplate(config, ctx, queryField),
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
      generateAuthExpressionForSandboxMode(ctx.sandboxModeEnabled),
      `${queryTypeName}.${queryField}.{slotName}.{slotIndex}.res.vtl`,
    ),
  );

  resolver.mapToStack(ctx.stackManager.getStackFor(resolverResourceId, table.stack.node.id));
  ctx.resolvers.addResolver(object.name.value, queryField, resolver);
}

function makeQueryRequestMappingTemplate(config: IndexDirectiveConfiguration, ctx: TransformerContextProvider, queryName: string): string {
  const { object } = config;
  const modelName = object.name.value;
  const dbType = getDBType(ctx, modelName);
  switch (dbType) {
    case 'MySQL':
      return makeRDSQueryRequestMappingTemplate(config, ctx, modelName, queryName);
    default:
      return makeDDBQueryRequestMappingTemplate(config, ctx);
  }
}

function makeDDBQueryRequestMappingTemplate(config: IndexDirectiveConfiguration, ctx: TransformerContextProvider): string {
  const { name, object, queryField } = config;
  if (!(name && queryField)) {
    throw new Error('Expected name and queryField to be defined while generating resolver.');
  }
  const authFilter = ref('ctx.stash.authFilter');
  const requestVariable = 'QueryRequest';
  return print(
    compoundExpression([
      setQuerySnippet(config, ctx, false),
      set(ref('limit'), ref(`util.defaultIfNull($context.args.limit, ${ResourceConstants.DEFAULT_PAGE_LIMIT})`)),
      set(
        ref(requestVariable),
        obj({
          version: str(RESOLVER_VERSION_ID),
          operation: str('Query'),
          limit: ref('limit'),
          query: ref(ResourceConstants.SNIPPETS.ModelQueryExpression),
          index: str(name),
        }),
      ),
      ifElse(
        raw(`!$util.isNull($ctx.args.sortDirection)
                && $ctx.args.sortDirection == "DESC"`),
        set(ref(`${requestVariable}.scanIndexForward`), bool(false)),
        set(ref(`${requestVariable}.scanIndexForward`), bool(true)),
      ),
      iff(ref('context.args.nextToken'), set(ref(`${requestVariable}.nextToken`), ref('context.args.nextToken')), true),
      ifElse(
        not(isNullOrEmpty(authFilter)),
        compoundExpression([
          set(ref('filter'), authFilter),
          iff(
            not(isNullOrEmpty(ref('ctx.args.filter'))),
            set(ref('filter'), obj({ and: list([ref('filter'), ref('ctx.args.filter')]) })),
          ),
        ]),
        iff(not(isNullOrEmpty(ref('ctx.args.filter'))), set(ref('filter'), ref('ctx.args.filter'))),
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
              set(ref(`${requestVariable}.filter`), ref('filterExpression')),
            ]),
          ),
        ]),
      ),
      raw(`$util.toJson($${requestVariable})`),
    ]),
  );
}

function makeRDSQueryRequestMappingTemplate(
  config: IndexDirectiveConfiguration,
  ctx: TransformerContextProvider,
  tableName: string,
  operationName: string,
): string {
  //TODO: Verify correctness of template once Lambda code is merged.
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('args'), obj({})),
      set(ref('args.args'), ref('context.arguments')),
      set(ref('args.table'), str(tableName)),
      set(ref('args.operation'), str('QUERY')),
      set(ref('args.operationName'), str(operationName)),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('args')),
      }),
    ]),
  );
}
