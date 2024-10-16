import { NONE_DATA_SOURCE, NO_SUBSTITUTIONS, ResolverFunctionDefinition } from './resolver-function-definition';

export const listMessagesInitSlotDefinition: ResolverFunctionDefinition = {
  slotName: 'init',
  fileName: 'list-messages-init-resolver-fn.template.js',
  templateName: (config) => `Query.${config.field.name.value}.list-messages-init.js`,
  dataSource: NONE_DATA_SOURCE,
  substitutions: NO_SUBSTITUTIONS,
};