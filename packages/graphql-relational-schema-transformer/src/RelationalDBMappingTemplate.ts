import {
  obj, str, ObjectNode, ListNode, ref, methodCall,
} from 'graphql-mapping-template';

/**
 * The class that contains the resolver templates for interacting
 * with the Relational Database data source.
 */
export class RelationalDBMappingTemplate {
  /**
   * Provided a SQL statement, creates the rds-query item resolver template.
   *
   * @param param0 - the SQL statement to use when querying the RDS cluster
   * @param param0.statements
   * @param param0.variableMapRefName
   */
  public static rdsQuery({ statements, variableMapRefName }: { statements: ListNode, variableMapRefName?: string }): ObjectNode {
    return obj({
      version: str('2018-05-29'),
      statements,
      variableMap: variableMapRefName ? methodCall(ref('util.toJson'), ref(variableMapRefName)) : obj({}),
    });
  }
}
