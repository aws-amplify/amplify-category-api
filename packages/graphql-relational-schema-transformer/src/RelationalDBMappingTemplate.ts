import { ListNode, methodCall, obj, ObjectNode, ref, str } from 'graphql-mapping-template';

/**
 * The class that contains the resolver templates for interacting
 * with the Relational Database data source.
 */
export class RelationalDBMappingTemplate {
  /**
   * Provided a SQL statement, creates the rds-query item resolver template.
   *
   * @param param0 - the SQL statement to use when querying the RDS cluster
   */
  public static rdsQuery({ statements, variableMapRefName }: { statements: ListNode; variableMapRefName?: string }): ObjectNode {
    return obj({
      version: str('2018-05-29'),
      statements: statements,
      variableMap: variableMapRefName ? methodCall(ref('util.toJson'), ref(variableMapRefName)) : obj({}),
    });
  }
}
