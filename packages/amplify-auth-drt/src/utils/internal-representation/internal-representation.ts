import { hasKey } from '../type-utils';
import { JsonExpr } from './json-expr';

/**
 * A common representation shared between Cedar and Amplify VTL-based auth.
 */
export interface InternalRepresentation {
  decision: Decision;
  residuals?: Residual[];
}

export type Decision = AllowDecision | DenyDecision | PartialDecision;

export interface AllowDecision {
  decision: 'ALLOW';
}
export const isAllowDecision = (obj: any): obj is AllowDecision => hasKey(obj, 'decision') && obj.decision === 'ALLOW';

export interface DenyDecision {
  decision: 'DENY';
}
export const isDenyDecision = (obj: any): obj is DenyDecision => hasKey(obj, 'decision') && obj.decision === 'DENY';

export interface PartialDecision {
  decision: 'NONE';
  residuals: Residual[];
}
export const isPartialDecision = (obj: any): obj is PartialDecision => hasKey(obj, 'decision') && obj.decision === 'NONE';

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
 * and do a direct comparison.
 */

/* eslint-enable max-len */
export interface Residual {
  conditions: JsonExpr[];
}
