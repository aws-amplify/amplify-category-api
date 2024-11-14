/**
 * A common representation shared between Cedar and Amplify VTL-based auth.
 */
export interface InternalRepresentation {
  decision: Decision;
  residuals?: Residual[];
}

export enum Decision {
  ALLOW,
  DENY,
  NONE,
}

/* eslint-disable max-len */

/**
 * An unresolved authorization decision that must be fulfilled with concrete data to render a decision.
 *
 * In Amplify AuthZ, we represent these as "auth filter" that we would convert to a DynamoDB query expression or SQL `WHERE` clause.
 *
 * Cedar represents these as CedarResiduals, with conditions built against `unknown` values. The job of each of the IR transformers is to
 * map the source residual into this common format.
 *
 * NOTE: For the POC, we're simplifying this by assuming only one condition, and that all conditions are of `kind == 'when'`
 *
 * The Cedar policy:
 *
 * ```cedar
 * permit (
 *   principal is AmplifyApi::AmplifyCognitoUserPoolsUser,
 *   action in [AmplifyApi::Action::"query"],
 *   resource == AmplifyApi::QueryField::"getTodoOwner"
 * )
 * when
 * {
 *   context has result && context.result has owner &&
 *   (context.result.owner == principal.subUsername ||
 *   context.result.owner == principal.sub ||
 *   context.result.owner == principal.username)
 * };
 * ```
 * Evaluated against a principal entity with `{sub: 'uuid', username: 'my-username'}` but no context.result, yields the Cedar policy
 * residual:
 *
 * ```
 * {"decision":null,"residuals":[{"effect":"permit","principal":{"op":"All"},"action":{"op":"All"},"resource":{"op":"All"},"conditions":[{"kind":"when","body":{"&&":{"left":{"Value":true},"right":{"&&":{"left":{"&&":{"left":{"has":{"left":{"unknown":[{"Value":"context"}]},"attr":"result"}},"right":{"has":{"left":{".":{"left":{"Var":"context"},"attr":"result"}},"attr":"owner"}}}},"right":{"||":{"left":{"||":{"left":{"==":{"left":{".":{"left":{".":{"left":{"Var":"context"},"attr":"result"}},"attr":"owner"}},"right":{".":{"left":{"Var":"principal"},"attr":"subUsername"}}}},"right":{"==":{"left":{".":{"left":{".":{"left":{"Var":"context"},"attr":"result"}},"attr":"owner"}},"right":{".":{"left":{"Var":"principal"},"attr":"sub"}}}}}},"right":{"==":{"left":{".":{"left":{".":{"left":{"Var":"context"},"attr":"result"}},"attr":"owner"}},"right":{".":{"left":{"Var":"principal"},"attr":"username"}}}}}}}}}}}],"annotations":{"id":"permit owners to get"}}]}
 * ```
 *
 * The equivalent Amplify `@auth` rule:
 *
 * ```
 * auth(rules: [ { allow: owner } ])
 * ```
 *
 * After transforming into a mapping template, and evaluating, generates the filter expression:
 *
 * ```
 * {
 *   or: [
 *     {
 *       owner: {
 *         eq: 'uuid::my-username',
 *       },
 *     },
 *     {
 *       owner: {
 *         eq: 'uuid',
 *       },
 *     },
 *     {
 *       owner: {
 *         eq: 'my-username',
 *       },
 *     },
 *   ],
 * }
 * ```
 *
 * Where the expression is evaluated as a way to retrieve a result. Long term, we want to convert Cedar partials into a filter expression
 * and do a direct comparison. But since we don't have a way yet to convert Cedar partials to filter expressions, we're going to simplify by
 * reducing to something based on the Amplify filter expression:
 *
 * ```
 * {
 *   "or": [
 *     {
 *       "owner": {
 *         "eq": "uuid::my-username",
 *       },
 *     },
 *     {
 *       "owner": {
 *         "eq": "uuid",
 *       },
 *     },
 *     {
 *       "owner": {
 *         "eq": "my-username",
 *       },
 *     },
 *   ],
 * }
 * ```
 */
/* eslint-enable max-len */
export interface Residual {
  conditions: JsonExpr[];
}

/**
 * Marker interface that concrete expressions can conform to. See https://docs.cedarpolicy.com/policies/json-format.html#JsonExpr-Value
 *
 * NOTE: For the POC, we're only implementing a small subset of supported expressions:
 * - Literal values
 * - Binary operators:
 *   - `eq`
 *   - `and`
 *   - `or`
 * - `.`
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonExpr {}

/**
 * Allows converters to return an empty object for unsupported expressions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonExprEmpty {}

export interface JsonExprValue extends JsonExpr {
  value: JsonExprLiteral;
}

export type JsonExprLiteral = boolean | number | string;

export interface JsonExprAnd extends JsonExpr {
  key: 'and';
  left: JsonExpr;
  right: JsonExpr;
}

/**
 * The JsonExpr representing attribute access via the `.` operator.
 */
export interface JsonExprAttrAccess extends JsonExpr {
  key: 'attr';
  left: JsonExpr;
  attr: string;
}

export interface JsonExprEq extends JsonExpr {
  key: 'eq';
  left: JsonExpr;
  right: JsonExpr;
}

/**
 * The JsonExpr representing the 'has' operator
 */
export interface JsonExprHas extends JsonExpr {
  key: 'has';
  left: JsonExpr;
  attr: string;
}

export interface JsonExprOr extends JsonExpr {
  key: 'or';
  left: JsonExpr;
  right: JsonExpr;
}

export interface JsonExprRecord extends JsonExpr {
  [key: string]: JsonExpr;
}

export interface JsonExprUnknown extends JsonExpr {
  key: 'unknown';
  left: JsonExpr;
  attr: string;
}
