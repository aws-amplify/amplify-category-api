import { TransformerPreProcessContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode, ObjectTypeDefinitionNode, DirectiveNode, parse, DefinitionNode } from 'graphql';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConversationDirective } from '@aws-amplify/graphql-directives';

const conversationSupportingSchemaTypes = fs.readFileSync(path.join(__dirname, '../conversation-schema-types.graphql'), 'utf8');

/*
Update: preProcessSchema was added as a hook for codegen to invoke, which modifies the customer defined model schema
in the same way that the transformers do in code.
See: https://github.com/aws-amplify/amplify-category-api/pull/20

---
  1. confirm whether invoking preProcess in transform.ts breaks relational and mapsTo(?) transformer.
    - If it does, rip out the mutateSchema implementations for those transformers and use mutateSchema in conversation transformer.
    - If it doesn't, create another transformer lifecycle method and use that.
  2. Have data-schema provide an empty ConversationMessage interface and populate that interface's fields in transformer.
  2 alternatve. Have data-schema generate the mutation with some scalar type and change the return type. This would let us drop the
  interface all together by using the concrete model type.
*/

export class ConversationSchemaMutator {
  mutateSchema(ctx: TransformerPreProcessContextProvider): DocumentNode {
    // if the schema doesn't contain the conversation directive, return the original schema document
    if (!this.containsConversationDirective(ctx)) return ctx.inputDocument;

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
