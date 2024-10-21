import { ConversationDirective } from '@aws-amplify/graphql-directives';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { InvalidDirectiveError, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConversationDirectiveConfiguration } from './conversation-directive-types';
import { ConversationFieldHandler } from './transformer-steps/conversation-field-handler';
import { ConversationPrepareHandler } from './transformer-steps/conversation-prepare-handler';
import { ConversationResolverGenerator } from './transformer-steps/conversation-resolver-generator';
import * as semver from 'semver';
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
    functionNameMap?: Record<string, lambda.IFunction>,
  ) {
    super('amplify-conversation-transformer', ConversationDirective.definition);
    this.fieldHandler = new ConversationFieldHandler();
    this.prepareHandler = new ConversationPrepareHandler(modelTransformer, hasManyTransformer, belongsToTransformer, authProvider);
    this.resolverGenerator = new ConversationResolverGenerator(functionNameMap);
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

  validate = (): void => {
    for (const directive of this.directives) {
      if (directive.field.type.kind !== 'NamedType' || directive.field.type.name.value !== 'ConversationMessage') {
        throw new InvalidDirectiveError('@conversation return type must be ConversationMessage');
      }
      if (directive.handler && directive.functionName) {
        throw new InvalidDirectiveError("'functionName' and 'handler' are mutually exclusive");
      }
      if (directive.handler) {
        const eventVersion = semver.coerce(directive.handler.eventVersion);
        if (eventVersion?.major !== 1) {
          throw new Error(
            `Unsupported custom conversation handler. Expected eventVersion to match 1.x, received ${directive.handler.eventVersion}`,
          );
        }
      }
    }
  };
}
