import { DataSourceProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

export const NONE_DATA_SOURCE = () => undefined;
export const NO_SUBSTITUTIONS = () => ({});

export type ResolverFunctionDefinition = {
  slotName: string;
  fileName: string;
  templateName: (config: ConversationDirectiveConfiguration) => string;
  dataSource: (config: ConversationDirectiveConfiguration) => DataSourceProvider | undefined;
  substitutions: (config: ConversationDirectiveConfiguration) => Record<string, string>;
};

export type PipelineDefinition = {
  requestSlots: ResolverFunctionDefinition[];
  dataSlot: ResolverFunctionDefinition;
  responseSlots: ResolverFunctionDefinition[];
  field: (config: ConversationDirectiveConfiguration) => { typeName: string; fieldName: string };
};
