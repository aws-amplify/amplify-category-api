import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DefinitionNode,
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
} from 'graphql';

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
    throw new InvalidDirectiveError(`@${directiveName} is not supported on type ${typeName}. It can only be used on a @model type.`);
  }
};

export const getMappedName = (
  definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  directive: DirectiveNode,
  directiveName: string,
  inputDocument: DocumentNode,
): string => {
  const modelName = definition.name.value;
  const mappedName = getNameInput(directive, directiveName);

  const schemaHasConflictingModel = !!inputDocument.definitions.find(hasModelWithNamePredicate(mappedName));
  if (schemaHasConflictingModel) {
    throw new InvalidDirectiveError(
      `Cannot apply @${directiveName} with name "${mappedName}" on type "${modelName}" because "${mappedName}" model already exists in the schema.`,
    );
  }

  const modelsWithDuplicateName = inputDocument?.definitions?.filter((def) =>
    isModelWithDuplicateMapping(def, modelName, mappedName, directiveName),
  );
  if (modelsWithDuplicateName?.length > 0) {
    throw new InvalidDirectiveError(
      `Cannot apply @${directiveName} with name "${mappedName}" on type "${modelName}" because "${
        (modelsWithDuplicateName[0] as ObjectTypeDefinitionNode)?.name?.value
      }" model already has the same name mapping.`,
    );
  }

  return mappedName;
};

export const getMappedFieldName = (
  parent: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  definition: FieldDefinitionNode,
  directive: DirectiveNode,
  directiveName: string,
): string => {
  const modelName = parent?.name?.value;
  const fieldName = definition?.name?.value;
  const mappedName = getNameInput(directive, directiveName);

  const fieldsWithSameMappings = parent?.fields?.filter((field) =>
    isFieldWithDuplicateMapping(field, fieldName, mappedName, directiveName),
  );
  if (fieldsWithSameMappings && fieldsWithSameMappings?.length > 0) {
    throw new InvalidDirectiveError(
      `Cannot apply @${directiveName} with name "${mappedName}" on field "${definition?.name?.value}" in type "${modelName}" because "${fieldsWithSameMappings[0]?.name?.value}" field already has the same name mapping.`,
    );
  }

  const fieldWithMappedName = parent?.fields?.find((field) => field?.name?.value === mappedName);
  if (fieldWithMappedName) {
    throw new InvalidDirectiveError(
      `Cannot apply @${directiveName} with name "${mappedName}" on field "${definition?.name?.value}" in type "${modelName}" because "${fieldWithMappedName?.name?.value}" field already exists in the model.`,
    );
  }

  return mappedName;
};

const getNameInput = (directive: DirectiveNode, directiveName: string): string => {
  const mappedNameNode = directive.arguments?.find((arg) => arg.name.value === 'name');
  if (!mappedNameNode) {
    throw new InvalidDirectiveError(`name is required in @${directiveName} directive.`);
  }

  if (mappedNameNode.value.kind !== 'StringValue') {
    throw new InvalidDirectiveError(`A single string must be provided for "name" in @${directiveName} directive`);
  }

  return mappedNameNode?.value?.value;
};

// returns a predicate for determining if a DefinitionNode is an model object with the given name
const hasModelWithNamePredicate = (name: string) => (node: DefinitionNode) =>
  node.kind === Kind.OBJECT_TYPE_DEFINITION && !!node.directives?.find((dir) => dir.name.value === 'model') && node.name.value === name;

// checks if a DefinitionNode is a model object with the given mapped name
const isModelWithDuplicateMapping = (node: DefinitionNode, modelName: string, mappedName: string, directiveName: string) =>
  node.kind === Kind.OBJECT_TYPE_DEFINITION &&
  node?.name?.value !== modelName &&
  !!node.directives?.find(
    (dir) =>
      dir.name.value === directiveName &&
      dir.arguments?.find((arg) => arg.name.value === 'name' && arg.value.kind === Kind.STRING && arg.value.value === mappedName),
  );

// checks if a FieldDefinitionNode is a field in a model object with the given mapped name
const isFieldWithDuplicateMapping = (node: FieldDefinitionNode, fieldName: string, mappedName: string, directiveName: string) =>
  node?.name?.value !== fieldName &&
  !!node.directives?.find(
    (dir) =>
      dir.name.value === directiveName &&
      dir.arguments?.find((arg) => arg.name.value === 'name' && arg.value.kind === Kind.STRING && arg.value.value === mappedName),
  );

export const updateFieldMapping = (
  modelName: string,
  fieldName: string,
  mappedName: string,
  context: TransformerSchemaVisitStepContextProvider,
) => {
  const modelFieldMap = context.resourceHelper.getModelFieldMap(modelName);
  modelFieldMap.addMappedField({ currentFieldName: fieldName, originalFieldName: mappedName });
};
