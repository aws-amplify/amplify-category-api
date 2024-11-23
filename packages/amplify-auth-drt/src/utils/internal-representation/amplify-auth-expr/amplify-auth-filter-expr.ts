/**
 * Marker interface that concrete expressions can conform to.
 *
 * NOTE: For the POC, we're only implementing a subset of supported expressions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AmplifyAuthFilterExpr {}

/**
 * A filter expression tied to an entity type, to give full context for a comparison between Amplify and Cedar evaluations. The `entityType`
 * represents the table or data source being queried with the filter expression.
 */
export interface AuthFilter {
  entityType: string;
  filterExpression: AmplifyAuthFilterExpr;
}
