import { TransformerResolver, MappingTemplate, APPSYNC_JS_RUNTIME } from "@aws-amplify/graphql-transformer-core";
import { TransformerContextProvider, MappingTemplateProvider, DataSourceProvider } from "@aws-amplify/graphql-transformer-interfaces";
import { ResolverResourceIDs } from "graphql-transformer-common";
import path from "path";
import fs from 'fs-extra';
import { ConversationDirectiveConfiguration } from "../grapqhl-conversation-transformer";
import { sendMessagePipelineDefinition } from "./send-message-pipeline-resolver";

export type PipelineSlotDefinition = {
  slotName: string;
  fileName: string;
  templateName: (config: ConversationDirectiveConfiguration) => string;
  dataSource: (config: ConversationDirectiveConfiguration) => DataSourceProvider | undefined;
  substitutions: (config: ConversationDirectiveConfiguration) => Record<string, string>;
};

export type PipelineDefinition = {
  requestSlots: PipelineSlotDefinition[];
  dataSlot: PipelineSlotDefinition;
  responseSlots: PipelineSlotDefinition[];
};


export class ConversationPipelineResolver {
  constructor(
    private readonly directiveConfig: ConversationDirectiveConfiguration,
    private readonly ctx: TransformerContextProvider,
    private readonly pipelineDefinition: PipelineDefinition = sendMessagePipelineDefinition,
  ) {}

  generatePipelineResolver(): TransformerResolver {
    const { parent, field } = this.directiveConfig;
    const parentName = parent.name.value;
    const fieldName = field.name.value;
    const resolverResourceId = this.generateResolverResourceID(this.directiveConfig);
    const codeMappingTemplate = this.generateMappingTemplateForSlot(this.pipelineDefinition.dataSlot);
    const dataSourceProvider = this.pipelineDefinition.dataSlot.dataSource(this.directiveConfig);

    const requestSlots = this.pipelineDefinition.requestSlots.map((slot) => slot.slotName);
    const responseSlots = this.pipelineDefinition.responseSlots.map((slot) => slot.slotName);

    const pipelineResolver = new TransformerResolver(
      parentName,
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
      const mappingTemplate = this.generateMappingTemplateForSlot(slot);
      pipelineResolver.addJsFunctionToSlot(slot.slotName, mappingTemplate, slot.dataSource(this.directiveConfig));
    }

    return pipelineResolver;
  }

  private generateResolverResourceID(directiveConfig: ConversationDirectiveConfiguration): string {
    const { parent, field } = directiveConfig;
    const parentName = parent.name.value;
    const fieldName = field.name.value;
    return ResolverResourceIDs.ResolverResourceID(parentName, fieldName);
  }

  private generateMappingTemplateForSlot(slot: PipelineSlotDefinition): MappingTemplateProvider {
    const template = fs.readFileSync(path.join(__dirname, slot.fileName), 'utf8');
    const substitutions = slot.substitutions(this.directiveConfig);
    const resolver = this.substituteResolverTemplateValues(template, substitutions);
    const templateName = slot.templateName(this.directiveConfig);
    return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
  }

  private substituteResolverTemplateValues(resolver: string, substitutions: Record<string, string>): string {
    Object.entries(substitutions).forEach(([key, value]) => {
      const replaced = resolver.replace(new RegExp(key, 'g'), value);
      resolver = replaced;
    });
    return resolver;
  }
}