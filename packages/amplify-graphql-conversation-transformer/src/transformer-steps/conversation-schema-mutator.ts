import { TransformerPreProcessContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode, ObjectTypeDefinitionNode, DirectiveNode, parse, DefinitionNode } from 'graphql';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConversationDirective } from '@aws-amplify/graphql-directives';

const conversationSupportingSchemaTypes = fs.readFileSync(path.join(__dirname, '../conversation-schema-types.graphql'), 'utf8');

export class ConversationSchemaMutator {
  mutateSchema(ctx: TransformerPreProcessContextProvider): DocumentNode {
    // if the schema doesn't contain the conversation directive, return the original schema document
    if (!this.containsConversationDirective(ctx)) {
      return ctx.inputDocument;
    }

    // create the conversation supporting type document from the .graphql file
    const conversationSupportingTypesDocument = parse(conversationSupportingSchemaTypes);

    // get the conversation supporting type definitions from the document
    const conversationSupportingTypesDefinitions = conversationSupportingTypesDocument.definitions as WritableDraft<DefinitionNode>[];

    // merge the conversation supporting types into the original schema document
    // TODO: handle name conflicts
    const documentWithConversationTypes = produce(ctx.inputDocument, (draftDoc) => {
      draftDoc.definitions.push(...conversationSupportingTypesDefinitions);
    });

    return documentWithConversationTypes;
  }

  private containsConversationDirective(ctx: TransformerPreProcessContextProvider): boolean {
    const mutations = ctx.inputDocument.definitions.filter(
      (def): def is ObjectTypeDefinitionNode => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Mutation',
    );

    const conversationMutations = mutations
      .map((mut) => mut.fields)
      .flat()
      .map((field) => field?.directives)
      .flat()
      .find((directive): directive is DirectiveNode => directive?.name.value === ConversationDirective.name);

    return conversationMutations !== undefined;
  }
}
