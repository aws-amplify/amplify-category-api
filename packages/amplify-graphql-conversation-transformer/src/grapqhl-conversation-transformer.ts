import { BelongsToDirective, ConversationDirective } from '@aws-amplify/graphql-directives';
import { DirectiveWrapper, InvalidDirectiveError, TransformerPluginBase, generateGetArgumentsInput } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerPreProcessContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, DocumentNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { blankObject, makeArgument, makeDirective, makeField, makeNamedType, makeNonNullType, makeValueNode, wrapNonNull } from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';

export type ConversationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  sessionModel: ObjectTypeDefinitionNode;
  messagesModel: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
}

export class ConversationTransformer extends TransformerPluginBase {
  private directives: ConversationDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-conversation-transformer', ConversationDirective.definition)
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    // assert that parent.name.value == 'Mutation'
    if (parent.name.value !== 'Mutation') {
      throw new InvalidDirectiveError('@conversation directive must be used on Mutation field.');
    }

    const directiveWrapped = new DirectiveWrapper(directive);
    const config = directiveWrapped.getArguments(
      {
        parent,
        directive,
        field: definition,
      } as ConversationDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    validate(config, context as TransformerContextProvider);
    this.directives.push(config);
  }

  mutateSchema = (ctx: TransformerPreProcessContextProvider): DocumentNode => {
    const document: DocumentNode = produce(ctx.inputDocument, (draft: WritableDraft<DocumentNode>) => {
      // for each directive
      const sessionModel = makeConversationSessionModel('ConversationSession_');
      const messagesModel = makeConversationMessageModel('ConversationMessage_');

      draft.definitions.push(sessionModel as WritableDraft<ObjectTypeDefinitionNode>);
      draft.definitions.push(messagesModel as WritableDraft<ObjectTypeDefinitionNode>);
    });
    return document
  }

  generateResolvers = (context: TransformerContextProvider): void => {
    console.log('context in generateResolvers', context);
  }
}

const validate = (config: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  // validation logic
  console.log(JSON.stringify(config));
  console.log(ctx);
}

const makeConversationSessionModel = (name: string): ObjectTypeDefinitionNode => {

  const object = blankObject(name);


  return object;
};

const makeConversationMessageModel = (name: string, sessionModel: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const conversationSessionId = makeField('conversationSessionId', [], makeNonNullType(makeNamedType('ID')));
  const referencesArg = makeArgument('references', makeValueNode(conversationSessionId.name.value));
  const sessionBelongsTo = makeDirective(BelongsToDirective.name, [referencesArg]);
  const session = makeField(
    'session', [], makeNamedType(sessionModel.name.value), [sessionBelongsTo]
  );
  const sender = makeField('sender', [], makeNamedType('ConversationMessageSender'));
  const text = makeField('text', [], makeNamedType('String'));

  const object = {
    ...blankObject(name),
    fields: [
      id,
      conversationSessionId,
      session,
      sender,
      text,
    ]
  }

  return object;
};