/**
 * No-op Request Function
 * @param {*} ctx the context
 * @returns {import('@aws-appsync/utils').NONERequest} the request
 */
export function request(ctx) {
  return { payload: {} };
}

/**
 * Echo the `message` parameter back as result.
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
  return ctx.arguments.message;
}
