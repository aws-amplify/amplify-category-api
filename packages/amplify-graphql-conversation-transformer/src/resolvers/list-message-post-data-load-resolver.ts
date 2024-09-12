import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';
import { JSResolverFunctionProvider } from './js-resolver-function-provider';

/**
 * Creates and returns the mapping template for the init resolver.
 * This includes both request and response functions.
 *
 * @returns {JSResolverFunctionProvider} An object containing request and response MappingTemplateProviders.
 */
export const listMessagePostDataLoadMappingTemplate = (): JSResolverFunctionProvider => {
  const req = createListMessagePostDataLoadRequestFunction();
  const res = createListMessagePostDataLoadResponseFunction();
  return { req, res };
};







/**
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */

const createListMessagePostDataLoadRequestFunction = (): MappingTemplateProvider => {
  const requestFunctionString = `
      export function request(ctx) {
        return {};
    }`;

  return MappingTemplate.inlineTemplateFromString(dedent(requestFunctionString));
};

/**
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
const createListMessagePostDataLoadResponseFunction = (): MappingTemplateProvider => {
  const responseFunctionString = `
      export function response(ctx) {
        const items = ctx.prev.result.items.reduce((acc, item) => {
            const userMessage = {
                ...item,
                role: "user",
                updatedAt: item.createdAt
            };
            delete userMessage.assistantContent;
            acc.push(userMessage);

            if (item.assistantContent) {
                const assistantMessage = {
                    ...item,
                    role: "assistant",
                    content: item.assistantContent,
                    createdAt: item.updatedAt,
                };
                delete assistantMessage.assistantContent;
                acc.push(assistantMessage);
            }

            return acc;
        }, []);
        return { ...ctx.prev.result, items };
    }`;

  return MappingTemplate.inlineTemplateFromString(dedent(responseFunctionString));
};
