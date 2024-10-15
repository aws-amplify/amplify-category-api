import { NONE_DATA_SOURCE, NO_SUBSTITUTIONS, PipelineDefinition, ResolverFunctionDefinition } from './conversation-pipeline-resolver';

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
