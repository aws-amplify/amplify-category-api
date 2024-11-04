import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The definition of the init slot for the list messages resolver.
 * This is used to set the index within the model generated list query.
 */
export const listMessagesPostProcessingFunctionDefinition: ResolverFunctionDefinition = createResolverFunctionDefinition({
  slotName: 'postDataLoad',
  fileName: 'list-messages-post-processing-resolver-fn.template.js',
  generateTemplate: createS3AssetMappingTemplateGenerator('Query', 'list-messages-post-processing', (config) => config.field.name.value),
});
