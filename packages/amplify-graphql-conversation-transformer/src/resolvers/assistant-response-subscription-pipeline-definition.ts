import { NO_SUBSTITUTIONS, NONE_DATA_SOURCE, PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

const dataSlot: ResolverFunctionDefinition = {
  slotName: 'init',
  fileName: 'assistant-messages-subscription-resolver-fn.template.js',
  templateName: (config) => `Subscription.${config.messageModel.messageSubscription.name.value}.assistant-message.js`,
  dataSource: NONE_DATA_SOURCE,
  substitutions: NO_SUBSTITUTIONS,
};

export const assistantResponseSubscriptionPipelineDefinition: PipelineDefinition = {
  requestSlots: [],
  dataSlot,
  responseSlots: [],
  field: (config) => ({ typeName: 'Subscription', fieldName: config.messageModel.messageSubscription.name.value }),
};
