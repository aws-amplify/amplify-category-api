import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  PipelineDefinition,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The pipeline definition for the assistant response subscription resolver.
 */
export const assistantResponseSubscriptionPipelineDefinition: PipelineDefinition = {
  requestSlots: [],
  dataSlot: data(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Subscription', fieldName: fieldName(config) }),
};

/**
 * The data slot for the assistant response subscription resolver.
 */
function data(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'assistant-messages-subscription-resolver-fn.template.js',
    generateTemplate: createS3AssetMappingTemplateGenerator('Subscription', 'assistant-message', fieldName),
  });
}

/**
 * Field name for the assistant response subscription.
 */
function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.assistantResponseSubscriptionField.name.value;
}
