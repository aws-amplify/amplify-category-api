import { ConversationDirective } from '@aws-amplify/graphql-directives';
import { DirectiveWrapper, InvalidDirectiveError, TransformerPluginBase, generateGetArgumentsInput } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode, DirectiveNode } from 'graphql';

export type ConversationDirectiveConfiguration = {
  directiveName: string;
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  sessionModel: ObjectTypeDefinitionNode;
  messagesModel: ObjectTypeDefinitionNode;
}

export class ConversationTransformer extends TransformerPluginBase {
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
        directiveName: ConversationDirective.name,
        parent,
        directive,
      } as ConversationDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    validate(config, context as TransformerContextProvider);
    // console.log({parent})
    // console.log({definition})
    // console.log({directive})
    // console.log(directive.arguments)
    // console.log({context})
  }

}

const validate = (config: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  // validation logic
  console.log(JSON.stringify(config));
  console.log(JSON.stringify(ctx));
}
