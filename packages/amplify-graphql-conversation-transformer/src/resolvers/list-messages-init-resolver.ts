import { LIST_MESSAGES_INDEX_NAME } from '../graphql-types/name-values';
import { createResolverFunctionDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * The definition of the init slot for the list messages resolver.
 * This is used to set the index within the model generated list query.
 */
export const listMessagesInitFunctionDefinition: ResolverFunctionDefinition = createResolverFunctionDefinition({
  slotName: 'init',
  fileName: 'list-messages-init-resolver-fn.template.js',
  templateName: (config) => `Query.${config.field.name.value}.list-messages-init.js`,
  substitutions: () => ({
    INDEX_NAME: LIST_MESSAGES_INDEX_NAME,
  }),
});
