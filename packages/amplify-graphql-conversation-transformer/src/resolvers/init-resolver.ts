import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';

/**
 * Creates and returns the mapping template for the init resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const initMappingTemplate = (): MappingTemplateProvider => {
  const req = createInitRequestFunction();
  const res = createInitResponseFunction();
  return MappingTemplate.inlineTemplateFromString(dedent(req + '\n' + res));
};

/**
 * Creates the request function for the init resolver.
 * This function sets up default values for id, createdAt, and updatedAt.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */

const createInitRequestFunction = (): string => {
  const requestFunctionString = `
      export function request(ctx) {
        ctx.stash.defaultValues = ctx.stash.defaultValues ?? {};
        ctx.stash.defaultValues.id = util.autoId();
        const createdAt = util.time.nowISO8601();
        ctx.stash.defaultValues.createdAt = createdAt;
        ctx.stash.defaultValues.updatedAt = createdAt;
        return {
          version: '2018-05-09',
          payload: {}
        };
      }`;

  return requestFunctionString;
};

/**
 * Creates the response function for the init resolver.
 * This function currently returns an empty object.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
  const createInitResponseFunction = (): string => {
  const responseFunctionString = `
      export function response(ctx) {
        return {};
      }`;

  return responseFunctionString;
};
