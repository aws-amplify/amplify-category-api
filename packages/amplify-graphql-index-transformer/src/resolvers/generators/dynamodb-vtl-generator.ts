import { TransformerContextProvider, TransformerResolverProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
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
  obj,
  print,
  qref,
  raw,
  ref,
  RESOLVER_VERSION_ID,
  set,
  str,
} from 'graphql-mapping-template';
import { ResourceConstants } from 'graphql-transformer-common';
import { replaceDdbPrimaryKey, updateResolvers, setQuerySnippet } from '../resolvers';
import { IndexDirectiveConfiguration, PrimaryKeyDirectiveConfiguration } from '../../types';
import { IndexVTLGenerator } from './vtl-generator';

export class DynamoDBIndexVTLGenerator implements IndexVTLGenerator {
  generateIndexQueryRequestTemplate(
    config: IndexDirectiveConfiguration,
    ctx: TransformerContextProvider,
    tableName: string,
    operationName: string,
  ): string {
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
                set(ref(`${requestVariable}.filter`), ref('filterExpression')),
              ]),
            ),
          ]),
        ),
        raw(`$util.toJson($${requestVariable})`),
      ]),
    );
  }

  generatePrimaryKeyVTL = (
    config: PrimaryKeyDirectiveConfiguration,
    ctx: TransformerContextProvider,
    resolverMap: Map<TransformerResolverProvider, string>,
  ): void => {
    replaceDdbPrimaryKey(config, ctx);
    updateResolvers(config, ctx, resolverMap);
  };
}
