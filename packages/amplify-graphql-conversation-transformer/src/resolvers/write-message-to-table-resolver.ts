import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';

/**
 * Creates a mapping template for writing a message to a table in a conversation.
 *
 * @param {string} fieldName - The name of the field to write to the table.
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const writeMessageToTableMappingTemplate = (fieldName: string): MappingTemplateProvider => {
  const req = createWriteMessageToTableRequestFunction(fieldName);
  const res = createWriteMessageToTableResponseFunction();
  return MappingTemplate.inlineTemplateFromString(dedent(req + '\n' + res));
};

/**
 * Creates the request function for writing a message to a table in a conversation.
 *
 * @param {string} fieldName - The name of the field to write to the table.
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */
const createWriteMessageToTableRequestFunction = (fieldName: string): string => {
  const requestFunctionString = `
    import { util } from '@aws-appsync/utils'
    import * as ddb from '@aws-appsync/utils/dynamodb'

    export function request(ctx) {
      const args = ctx.stash.transformedArgs ?? ctx.args;
      const defaultValues = ctx.stash.defaultValues ?? {};
      const message = {
          __typename: 'ConversationMessage${fieldName}',
          role: 'user',
          ...args,
          ...defaultValues,
      };
      const id = ctx.stash.defaultValues.id;

      return ddb.put({ key: { id }, item: message });
    }
    `;

  return requestFunctionString;
};

/**
 * Creates the response function for writing a message to a table in a conversation.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
const createWriteMessageToTableResponseFunction = (): string => {
  const responseFunctionString = `
    export function response(ctx) {
      if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
      } else {
        return ctx.result;
      }
    }
    `;

  return responseFunctionString;
};
