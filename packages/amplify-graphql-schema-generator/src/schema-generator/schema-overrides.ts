import { DocumentNode, FieldDefinitionNode, ObjectTypeDefinitionNode, visit } from 'graphql';
import { isArrayOrObject, findMatchingField, getNonModelTypes, isOfType, isNonNullType } from 'graphql-transformer-common';
import { printer } from '@aws-amplify/amplify-prompts';

export const applySchemaOverrides = (document: DocumentNode, existingDocument?: DocumentNode): DocumentNode => {
  if (!existingDocument) {
    return document;
  }

  const schemaVisitor = {
    FieldDefinition: {
      leave(node: FieldDefinitionNode, key, parent, path, ancestors): any {
        const parentObjectType = getParentNode(ancestors);
        if (!parentObjectType || !parentObjectType?.name) {
          return;
        }

        const correspondingField = findMatchingField(node, parentObjectType, existingDocument);
        if (!correspondingField) return;

        return applyFieldOverrides(node, correspondingField);
      },
    },
  };

  const updatedDocument = visit(document, schemaVisitor);
  updatedDocument['definitions'] = [...updatedDocument['definitions'], ...getNonModelTypes(existingDocument)];
  return updatedDocument;
};

export const applyFieldOverrides = (field: FieldDefinitionNode, existingField: FieldDefinitionNode): FieldDefinitionNode => {
  return {
    ...field,
    ...applyJSONFieldTypeOverrides(field, existingField),
  };
};

export const applyJSONFieldTypeOverrides = (field: FieldDefinitionNode, existingField: FieldDefinitionNode): FieldDefinitionNode => {
  const isJSONType = isOfType(field?.type, 'AWSJSON');
  if (!isJSONType) {
    return field;
  }

  const isExistingFieldArrayOrObject = isArrayOrObject(existingField?.type, []);
  if (!isExistingFieldArrayOrObject) {
    return field;
  }

  checkDestructiveNullabilityChange(field, existingField);

  return {
    ...field,
    ...{ type: existingField?.type },
  };
};

export const getParentNode = (ancestors: any[]): ObjectTypeDefinitionNode | undefined => {
  if (ancestors && ancestors?.length > 0) {
    return ancestors[ancestors.length - 1] as ObjectTypeDefinitionNode;
  }
};

export const checkDestructiveNullabilityChange = (field: FieldDefinitionNode, existingField: FieldDefinitionNode) => {
  const isFieldRequired = isNonNullType(field?.type);
  const isExistingFieldRequired = isNonNullType(existingField?.type);
  if (isFieldRequired && !isExistingFieldRequired) {
    printer.warn(
      `The field ${field?.name?.value} has been changed to an optional type while it is required in the database. This may result in SQL errors in the mutations.`,
    );
  }
};
