import { ConversationDirective } from '@aws-amplify/graphql-directives';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { InvalidDirectiveError, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DirectiveNode, DocumentNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConversationDirectiveConfiguration } from './conversation-directive-configuration';
import { ConversationFieldHandler } from './transformer-steps/conversation-field-handler';
import { ConversationPrepareHandler } from './transformer-steps/conversation-prepare-handler';
import { ConversationResolverGenerator } from './transformer-steps/conversation-resolver-generator';
import { ConversationSchemaMutator } from './transformer-steps/conversation-schema-mutator';
/**
 * Transformer for handling `@conversation` directives in GraphQL schemas
 */
export class ConversationTransformer extends TransformerPluginBase {
  private directives: ConversationDirectiveConfiguration[] = [];
  private schemaMutator: ConversationSchemaMutator;
  private fieldHandler: ConversationFieldHandler;
  private prepareHandler: ConversationPrepareHandler;
  private resolverGenerator: ConversationResolverGenerator;

  constructor(
    modelTransformer: ModelTransformer,
    hasManyTransformer: HasManyTransformer,
    belongsToTransformer: BelongsToTransformer,
    authProvider: TransformerAuthProvider,
    functionNameMap?: Record<string, lambda.IFunction>,
  ) {
    super('amplify-conversation-transformer', ConversationDirective.definition);
    this.schemaMutator = new ConversationSchemaMutator();
    this.fieldHandler = new ConversationFieldHandler();
    this.prepareHandler = new ConversationPrepareHandler(modelTransformer, hasManyTransformer, belongsToTransformer, authProvider);
    this.resolverGenerator = new ConversationResolverGenerator(functionNameMap);
  }

  mutateSchema = (ctx: TransformerPreProcessContextProvider): DocumentNode => {
    return this.schemaMutator.mutateSchema(ctx);
  }

  /**
   * Processes a field with the @conversation directive
   * @param parent - The parent object type definition
   * @param definition - The field definition
   * @param directive - The directive node
   * @param context - The transformer context
   */
  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveConfg = this.fieldHandler.getDirectiveConfig(parent, definition, directive, context);
    this.directives.push(directiveConfg);
  };

  /**
   * Generates resolvers for the conversation directive
   * @param ctx - The transformer context provider
   */
  generateResolvers = (ctx: TransformerContextProvider): void => {
    this.resolverGenerator.generateResolvers(this.directives, ctx);
  };

  /**
   * Prepares resources for the conversation directive
   * @param ctx - The transformer prepare step context provider
   */
  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    this.prepareHandler.prepare(ctx, this.directives);
  };
}
