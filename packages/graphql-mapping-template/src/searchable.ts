import { obj, Expression, str, ObjectNode, raw, CompoundExpressionNode, ListNode, BooleanNode, bool } from './ast';
import { vtlPrinter, Printer } from './printer';

const RESOLVER_VERSION_ID = '2018-05-29';

export class SearchableMappingTemplate {
  /**
   * Create a mapping template for @searchable.
   */
  public static genericTemplate({
    operation,
    path,
    params,
  }: {
    operation: Expression;
    path: Expression;
    params: Expression | ObjectNode | CompoundExpressionNode;
  }): ObjectNode {
    return obj({
      version: str(RESOLVER_VERSION_ID),
      operation,
      path,
      params,
    });
  }

  /**
   * Create a search item resolver template.
   * @param size the size limit
   * @param search_after the next token
   * @param from the pagination offset
   * @param query the query
   */
  public static searchItem({
    query,
    size,
    search_after,
    from,
    path,
    sort,
    version = bool(false),
    printer = vtlPrinter,
  }: {
    path: Expression;
    sort?: Expression | ObjectNode;
    query?: ObjectNode | Expression;
    size?: Expression;
    search_after?: Expression | ListNode;
    from?: Expression;
    version?: BooleanNode;
    aggs?: Expression | ObjectNode;
    printer?: Printer;
  }): ObjectNode {
    return obj({
      version: str(RESOLVER_VERSION_ID),
      operation: str('GET'),
      path,
      params: obj({
        body: raw(`{
                #if( $context.args.nextToken )"search_after": ${printer.print(search_after)}, #end
                #if( $context.args.from )"from": ${printer.print(from)}, #end
                "size": ${printer.print(size)},
                "sort": ${printer.print(sort)},
                "version": ${printer.print(version)},
                "query": ${printer.print(query)}
                }`),
      }),
    });
  }

  /**
   * Create a search item resolver template.
   * @param size the size limit
   * @param search_after the next token
   * @param from the pagination offset
   * @param query the query
   * @param aggs aggregate the query results
   */
  public static searchTemplate({
    query,
    size,
    search_after,
    from,
    path,
    sort,
    version = bool(false),
    aggs,
    printer = vtlPrinter,
  }: {
    path: Expression;
    sort?: Expression | ObjectNode;
    query?: ObjectNode | Expression;
    size?: Expression;
    search_after?: Expression | ListNode;
    from?: Expression;
    version?: BooleanNode;
    aggs?: Expression | ObjectNode;
    printer?: Printer;
  }): ObjectNode {
    return obj({
      version: str(RESOLVER_VERSION_ID),
      operation: str('GET'),
      path,
      params: obj({
        body: raw(`{
                #if( $context.args.nextToken )"search_after": ${printer.print(search_after)}, #end
                #if( $context.args.from )"from": ${printer.print(from)}, #end
                "size": ${printer.print(size)},
                "sort": ${printer.print(sort)},
                "version": ${printer.print(version)},
                "query": ${printer.print(query)},
                "aggs": ${printer.print(aggs)}
                }`),
      }),
    });
  }
}
