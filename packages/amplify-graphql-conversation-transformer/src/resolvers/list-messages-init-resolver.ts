import { createResolverFunctionDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * The definition of the init slot for the list messages resolver.
 * This is used to set the index within the model generated list query.
 */
export const listMessagesInitSlotDefinition: ResolverFunctionDefinition = createResolverFunctionDefinition({
  slotName: 'init',
  fileName: 'list-messages-init-resolver-fn.template.js',
  templateName: (config) => `Query.${config.field.name.value}.list-messages-init.js`,
});
