import { DataSourceProvider, MappingTemplateProvider, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';

/**
 * Creates a resolver function definition based on the provided definition, with NONE data source and empty substitutions if not provided.
 * @param definition - The base definition of the resolver function.
 * @returns A resolver function definition with default values for data source and substitutions if not provided.
 */
export const createResolverFunctionDefinition = (
  definition: Optional<ResolverFunctionDefinition, 'dataSource' | 'substitutions'>,
): ResolverFunctionDefinition => {
  return {
    ...definition,
    dataSource: definition.dataSource ?? NONE_DATA_SOURCE,
    substitutions: definition.substitutions ?? EMPTY_SUBSTITUTIONS,
  };
};

/**
 * The definition of a resolver function, including file name, template name, data source, and substitutions.
 */
export type ResolverFunctionDefinition = {
  slotName: string;
  fileName: string;
  generateTemplate: (config: ConversationDirectiveConfiguration, code: string) => MappingTemplateProvider;
  dataSource: (config: ConversationDirectiveConfiguration) => DataSourceProvider | undefined;
  substitutions: (config: ConversationDirectiveConfiguration, ctx: TransformerContextProvider) => Record<string, string>;
};

/**
 * The definition of a pipeline resolver, including request slots, data slot, and response slots.
 */
export type PipelineDefinition = {
  requestSlots: ResolverFunctionDefinition[];
  dataSlot: ResolverFunctionDefinition;
  responseSlots: ResolverFunctionDefinition[];
  field: (config: ConversationDirectiveConfiguration) => { typeName: string; fieldName: string };
};

/**
 * Creates an S3 asset mapping template generator for the resolver function.
 */
export const createS3AssetMappingTemplateGenerator =
  (parentName: string, slotName: string, fieldName: (config: ConversationDirectiveConfiguration) => string) =>
  (config: ConversationDirectiveConfiguration, code: string) =>
    MappingTemplate.s3MappingFunctionCodeFromString(code, `${parentName}.${fieldName(config)}.${slotName}.js`);

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const NONE_DATA_SOURCE = () => undefined;
const EMPTY_SUBSTITUTIONS = () => ({});
