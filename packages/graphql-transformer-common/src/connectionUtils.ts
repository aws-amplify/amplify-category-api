import { DirectiveNode, FieldDefinitionNode, InputValueDefinitionNode } from 'graphql';
import { makeField, makeInputValueDefinition, makeNamedType } from './definition';
import { ModelResourceIDs } from './ModelResourceIDs';

export function makeConnectionField(
  fieldName: string,
  returnTypeName: string,
  args: InputValueDefinitionNode[] = [],
  directives: DirectiveNode[] = [],
): FieldDefinitionNode {
  return makeField(
    fieldName,
    [
      ...args,
      makeInputValueDefinition('filter', makeNamedType(ModelResourceIDs.ModelFilterInputTypeName(returnTypeName))),
      makeInputValueDefinition('limit', makeNamedType('Int')),
      makeInputValueDefinition('nextToken', makeNamedType('String')),
    ],
    makeNamedType(ModelResourceIDs.ModelConnectionTypeName(returnTypeName)),
    directives,
  );
}
