import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import { createResolverFunctionDefinition, PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * The pipeline definition for the assistant response subscription resolver.
 */
export const assistantResponseSubscriptionPipelineDefinition: PipelineDefinition = {
  requestSlots: [],
  dataSlot: data(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Subscription', fieldName: fieldName(config) }),
};

function data(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'assistant-messages-subscription-resolver-fn.template.js',
    templateName: (config) => `Subscription.${fieldName(config)}.assistant-message.js`,
  });
}

function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.assistantResponseSubscriptionField.name.value;
}
