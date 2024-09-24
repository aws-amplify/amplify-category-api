import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * Represents a provider for JavaScript resolver functions.
 *
 * @property {MappingTemplateProvider} req - The request mapping template provider.
 * @property {MappingTemplateProvider} res - The response mapping template provider.
 */
export type JSResolverFunctionProvider = { req: MappingTemplateProvider; res: MappingTemplateProvider };
