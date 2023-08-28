import { TransformerPreProcessContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  ObjectTypeDefinitionNode,
  DirectiveNode,
  Kind,
  DefinitionNode,
  DocumentNode,
  ObjectTypeExtensionNode,
  StringValueNode,
} from 'graphql';
import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';

export const setTypeMappingInSchema = (context: TransformerPreProcessContextProvider, directiveName: string) => {
  context.inputDocument?.definitions?.forEach((def) => {
    if (def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension') {
      def?.directives?.forEach((dir) => {
        if (dir.name.value === directiveName) {
          const modelName = def.name.value;
          const mappedName = getMappedName(def, dir, directiveName, context.inputDocument);
          updateTypeMapping(modelName, mappedName, context.schemaHelper.setTypeMapping);
        }
      });
    }
  });
};

export const updateTypeMapping = (
  modelName: string,
  mappedName: string,
  updateFunction: (newTypeName: string, originalTypeName: string) => void,
) => {
  updateFunction(modelName, mappedName);
};

export const shouldBeAppliedToModel = (definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode, directiveName: string) => {
  const typeName = definition.name.value;
  const hasModelDirective = !!definition.directives?.find((directive) => directive.name.value === 'model');
  if (!hasModelDirective) {
    throw new InvalidDirectiveError(`${directiveName} is not supported on type ${typeName}. It can only be used on a @model type.`);
  }
};

export const getMappedName = (
  definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  directive: DirectiveNode,
  directiveName: string,
  inputDocument: DocumentNode,
): string => {
  const mappedNameNode = directive.arguments?.find((arg) => arg.name.value === 'name');
  if (!mappedNameNode) {
    throw new InvalidDirectiveError(`name is required in @${directiveName} directive.`);
  }

  if (mappedNameNode.value.kind !== 'StringValue') {
    throw new InvalidDirectiveError(`A single string must be provided for "name" in @${directiveName} directive`);
  }

  const modelName = definition.name.value;
  const originalName = mappedNameNode.value.value;

  const schemaHasConflictingModel = !!inputDocument.definitions.find(hasModelWithNamePredicate(originalName));
  if (schemaHasConflictingModel) {
    throw new InvalidDirectiveError(
      `Cannot apply ${directiveName} with name ${originalName} on type ${modelName} because ${originalName} model already exists in the schema.`,
    );
  }

  return (mappedNameNode.value as StringValueNode)?.value;
};

// returns a predicate for determining if a DefinitionNode is an model object with the given name
const hasModelWithNamePredicate = (name: string) => (node: DefinitionNode) =>
  node.kind === Kind.OBJECT_TYPE_DEFINITION && !!node.directives?.find((dir) => dir.name.value === 'model') && node.name.value === name;
