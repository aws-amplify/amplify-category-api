import { LIST_MESSAGES_INDEX_NAME } from '../graphql-types/name-values';
import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The definition of the init slot for the list messages resolver.
 * This is used to set the index within the model generated list query.
 */
export const listMessagesInitFunctionDefinition: ResolverFunctionDefinition = createResolverFunctionDefinition({
  slotName: 'init',
  fileName: 'list-messages-init-resolver-fn.template.js',
  generateTemplate: createS3AssetMappingTemplateGenerator('Query', 'list-messages-init', (config) => config.field.name.value),
  substitutions: () => ({
    INDEX_NAME: LIST_MESSAGES_INDEX_NAME,
  }),
});
