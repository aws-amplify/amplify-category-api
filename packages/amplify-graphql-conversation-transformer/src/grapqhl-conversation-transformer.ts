import { ConversationDirective } from '@aws-amplify/graphql-directives';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import {
  IBackendOutputStorageStrategy,
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConversationDirectiveConfiguration } from './conversation-directive-configuration';
import { ConversationFieldHandler } from './transformer-steps/conversation-field-handler';
import { ConversationPrepareHandler } from './transformer-steps/conversation-prepare-handler';
import { ConversationResolverGenerator } from './transformer-steps/conversation-resolver-generator';
/**
 * Transformer for handling `@conversation` directives in GraphQL schemas
 */
export class ConversationTransformer extends TransformerPluginBase {
  private directives: ConversationDirectiveConfiguration[] = [];
  private fieldHandler: ConversationFieldHandler;
  private prepareHandler: ConversationPrepareHandler;
  private resolverGenerator: ConversationResolverGenerator;

  constructor(
    modelTransformer: ModelTransformer,
    hasManyTransformer: HasManyTransformer,
    belongsToTransformer: BelongsToTransformer,
    authProvider: TransformerAuthProvider,
    outputStorageStrategy?: IBackendOutputStorageStrategy,
    functionNameMap?: Record<string, lambda.IFunction>,
  ) {
    super('amplify-conversation-transformer', ConversationDirective.definition);
    this.fieldHandler = new ConversationFieldHandler();
    this.prepareHandler = new ConversationPrepareHandler(modelTransformer, hasManyTransformer, belongsToTransformer, authProvider);
    this.resolverGenerator = new ConversationResolverGenerator(functionNameMap, outputStorageStrategy);
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
