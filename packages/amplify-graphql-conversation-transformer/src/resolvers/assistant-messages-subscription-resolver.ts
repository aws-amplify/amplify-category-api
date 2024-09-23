import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';

/**
 * Creates and returns the mapping template for the conversation message subscription resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const conversationMessageSubscriptionMappingTamplate = (): MappingTemplateProvider => {
  const req = createAssistantMessagesSubscriptionRequestFunction();
  const res = createAssistantMessagesSubscriptionResponseFunction();
  return MappingTemplate.inlineTemplateFromString(dedent(req + '\n' + res));
};

/**
 * Creates the request function for the conversation message subscription resolver.
 * This function handles the authorization and filtering of the conversation messages for owner auth.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */
const createAssistantMessagesSubscriptionRequestFunction = (): string => {
  const requestFunctionString = `
      export function request(ctx) {
        ctx.stash.hasAuth = true;
        const isAuthorized = false;

        if (util.authType() === 'User Pool Authorization') {
          if (!isAuthorized) {
            const authFilter = [];
            let ownerClaim0 = ctx.identity['claims']['sub'];
            ctx.args.owner = ownerClaim0;
            const currentClaim1 = ctx.identity['claims']['username'] ?? ctx.identity['claims']['cognito:username'];
            if (ownerClaim0 && currentClaim1) {
              ownerClaim0 = ownerClaim0 + '::' + currentClaim1;
              authFilter.push({ owner: { eq: ownerClaim0 } })
            }
            const role0_0 = ctx.identity['claims']['sub'];
            if (role0_0) {
              authFilter.push({ owner: { eq: role0_0 } });
            }
            // we can just reuse currentClaim1 here, but doing this (for now) to mirror the existing
            // vtl auth resolver.
            const role0_1 = ctx.identity['claims']['username'] ?? ctx.identity['claims']['cognito:username'];
            if (role0_1) {
              authFilter.push({ owner: { eq: role0_1 }});
            }
            if (authFilter.length !== 0) {
              ctx.stash.authFilter = { or: authFilter };
            }
          }
        }
        if (!isAuthorized && ctx.stash.authFilter.length === 0) {
          util.unauthorized();
        }
        ctx.args.filter = { ...ctx.args.filter, and: [{ conversationId: { eq: ctx.args.conversationId  }}]};
        return { version: '2018-05-29', payload: {} };
      }`;

  return requestFunctionString;
};

/**
 * Creates the response function for the conversation message subscription resolver.
 * This function handles the subscription filter and sets the subscription filter for the conversation messages.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
const createAssistantMessagesSubscriptionResponseFunction = (): string => {
  const responseFunctionString = `
      import { util, extensions } from '@aws-appsync/utils';

      export function response(ctx) {
          const subscriptionFilter = util.transform.toSubscriptionFilter(ctx.args.filter);
          extensions.setSubscriptionFilter(subscriptionFilter);
          return null;
      }`;

  return responseFunctionString;
};
