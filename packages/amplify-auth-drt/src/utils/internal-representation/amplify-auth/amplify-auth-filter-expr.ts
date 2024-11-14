/**
 * Marker interface that concrete expressions can conform to.
 *
 * NOTE: For the POC, we're only implementing a subset of supported expressions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AmplifyAuthFilterExpr {}

export interface AmplifyAuthFilterCondition {
  key: string
}