import { APPSYNC_JS_RUNTIME, MappingTemplate, TransformerResolver } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs-extra';
import { ResolverResourceIDs } from 'graphql-transformer-common';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import { PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * Generates a resolver pipeline based on the provided pipeline definition and directive configuration.
 * @param pipelineDefinition - The definition of the pipeline, including request slots, data slot, and response slots.
 * @param directiveConfig - The conversation directive configuration.
 * @returns A TransformerResolver object representing the generated resolver pipeline.
 */
export const generateResolverPipeline = (
  pipelineDefinition: PipelineDefinition,
  directiveConfig: ConversationDirectiveConfiguration,
): TransformerResolver => {
  const { typeName, fieldName } = pipelineDefinition.field(directiveConfig);
  const resolverResourceId = ResolverResourceIDs.ResolverResourceID(typeName, fieldName);
  const codeMappingTemplate = generateResolverFunction(pipelineDefinition.dataSlot, directiveConfig);
  const dataSourceProvider = pipelineDefinition.dataSlot.dataSource(directiveConfig);
  const requestSlots = pipelineDefinition.requestSlots.map((slot) => slot.slotName);
  const responseSlots = pipelineDefinition.responseSlots.map((slot) => slot.slotName);

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

  const resolverSlots = [...pipelineDefinition.requestSlots, ...pipelineDefinition.responseSlots];
  for (const slot of resolverSlots) {
    const mappingTemplate = generateResolverFunction(slot, directiveConfig);
    pipelineResolver.addJsFunctionToSlot(slot.slotName, mappingTemplate, slot.dataSource(directiveConfig));
  }

  return pipelineResolver;
};

/**
 * Generates a resolver function based on the provided function definition and directive configuration.
 * @param definition - The definition of the resolver function, including file name, template name, and substitutions.
 * @param config - The conversation directive configuration.
 * @returns A MappingTemplateProvider object representing the generated resolver function.
 */
export const generateResolverFunction = (
  definition: ResolverFunctionDefinition,
  config: ConversationDirectiveConfiguration,
): MappingTemplateProvider => {
  const template = fs.readFileSync(path.join(__dirname, 'templates', definition.fileName), 'utf8');
  const substitutions = definition.substitutions(config);
  const resolver = substituteResolverTemplateValues(template, substitutions);
  const templateName = definition.templateName(config);
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};

/**
 * Substitutes template values in a resolver string with provided substitutions.
 * @param resolver - The resolver string containing template placeholders in the form of [[key]].
 * @param substitutions - An object containing key-value pairs for substitution.
 * @returns The resolver string with substituted values.
 */
const substituteResolverTemplateValues = (resolver: string, substitutions: Record<string, string>): string => {
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });
  return resolver;
};
