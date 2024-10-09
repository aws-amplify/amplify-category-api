import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';

/**
 * Creates and returns the mapping template for the init resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const initMappingTemplate = (ctx: TransformerContextProvider): MappingTemplateProvider => {
  const substitutions = {
    GRAPHQL_API_ENDPOINT: ctx.api.graphqlUrl,
  };

  let resolver = fs.readFileSync(path.join(__dirname, 'init-resolver-fn.template.js'), 'utf8');
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });

  return MappingTemplate.inlineTemplateFromString(resolver);
};
