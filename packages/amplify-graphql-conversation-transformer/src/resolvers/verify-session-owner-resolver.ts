import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';

/**
 * Creates a mapping template for verifying the session owner in a conversation.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const verifySessionOwnerMappingTemplate = (): MappingTemplateProvider => {
  const req = createVerifySessionOwnerRequestFunction();
  const res = createVerifySessionOwnerResponseFunction();
  return MappingTemplate.inlineTemplateFromString(dedent(req + '\n' + res));
};

/**
 * Creates the request function for verifying the session owner in a conversation.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */
const createVerifySessionOwnerRequestFunction = (): string => {
  const requestFunctionString = `
      export function request(ctx) {
        const { authFilter } = ctx.stash;

        const query = {
          expression: 'id = :id',
          expressionValues: util.dynamodb.toMapValues({
            ':id': ctx.args.conversationId
          })
        };

        const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));

        return {
          operation: 'Query',
          query,
          filter
        };
      }
      `;

  return requestFunctionString;
};

/**
 * Creates the response function for verifying the session owner in a conversation.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
const createVerifySessionOwnerResponseFunction = (): string => {
  const responseFunctionString = `
      export function response(ctx) {
        if (ctx.error) {
          util.error(ctx.error.message, ctx.error.type);
        }

        if (ctx.result.items.length !== 0) {
          return ctx.result.items[0];
        }

        util.error('Conversation not found', 'ResourceNotFound');
      }`;

  return responseFunctionString;
};
