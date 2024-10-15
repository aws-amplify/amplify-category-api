import { TransformerResolver, MappingTemplate, APPSYNC_JS_RUNTIME } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider, DataSourceProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverResourceIDs } from 'graphql-transformer-common';
import path from 'path';
import fs from 'fs-extra';
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

export class ConversationPipelineResolver {
  constructor(
    private readonly directiveConfig: ConversationDirectiveConfiguration,
    private readonly pipelineDefinition: PipelineDefinition,
  ) {}

  generatePipelineResolver(): TransformerResolver {
    const { typeName, fieldName } = this.pipelineDefinition.field(this.directiveConfig);
    const resolverResourceId = ResolverResourceIDs.ResolverResourceID(typeName, fieldName);
    const codeMappingTemplate = generateResolverFunction(this.pipelineDefinition.dataSlot, this.directiveConfig);
    const dataSourceProvider = this.pipelineDefinition.dataSlot.dataSource(this.directiveConfig);

    const requestSlots = this.pipelineDefinition.requestSlots.map((slot) => slot.slotName);
    const responseSlots = this.pipelineDefinition.responseSlots.map((slot) => slot.slotName);

    const pipelineResolver = new TransformerResolver(
      typeName,
      fieldName,
      resolverResourceId,
      { codeMappingTemplate },
      requestSlots,
      responseSlots,
      dataSourceProvider,
      APPSYNC_JS_RUNTIME,
    );

    const resolverSlots = [...this.pipelineDefinition.requestSlots, ...this.pipelineDefinition.responseSlots];
    for (const slot of resolverSlots) {
      const mappingTemplate = generateResolverFunction(slot, this.directiveConfig);
      pipelineResolver.addJsFunctionToSlot(slot.slotName, mappingTemplate, slot.dataSource(this.directiveConfig));
    }

    return pipelineResolver;
  }
}

export const generateResolverFunction = (
  definition: ResolverFunctionDefinition,
  config: ConversationDirectiveConfiguration,
): MappingTemplateProvider => {
  const template = fs.readFileSync(path.join(__dirname, definition.fileName), 'utf8');
  const substitutions = definition.substitutions(config);
  const resolver = substituteResolverTemplateValues(template, substitutions);
  const templateName = definition.templateName(config);
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};

const substituteResolverTemplateValues = (resolver: string, substitutions: Record<string, string>): string => {
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });
  return resolver;
};
