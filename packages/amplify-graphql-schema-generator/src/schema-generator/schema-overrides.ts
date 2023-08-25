import { DocumentNode, FieldDefinitionNode, ObjectTypeDefinitionNode, visit } from 'graphql';
import { isArrayOrObject, findMatchingField, getNonModelTypes, isOfType, isNonNullType } from 'graphql-transformer-common';
import { printer } from '@aws-amplify/amplify-prompts';
import { FieldWrapper, ObjectDefinitionWrapper } from '@aws-amplify/graphql-transformer-core';

export const applySchemaOverrides = (document: DocumentNode, existingDocument?: DocumentNode | undefined): DocumentNode => {
  if (!existingDocument) {
    return document;
  }

  let updatedDocument = preserveRelationalDirectives(document, existingDocument) as any;
  const schemaVisitor = {
    FieldDefinition: {
      leave: (node: FieldDefinitionNode, key, parent, path, ancestors) => {
        const parentObjectType = getParentNode(ancestors);
        if (!parentObjectType || !parentObjectType?.name) {
          return;
        }

        const correspondingField = findMatchingField(node, parentObjectType, existingDocument);
        if (!correspondingField) return;

        // eslint-disable-next-line consistent-return
        return applyFieldOverrides(node, correspondingField);
      },
    },
  };

  updatedDocument = visit(updatedDocument, schemaVisitor);
  updatedDocument['definitions'] = [...updatedDocument['definitions'], ...getNonModelTypes(existingDocument)];

  return updatedDocument;
};

const preserveRelationalDirectives = (document: DocumentNode, existingDocument: DocumentNode): DocumentNode => {
  const MODEL_DIRECTIVE_NAME = 'model';
  const RELATIONAL_DIRECTIVES = ['hasOne', 'hasMany', 'belongsTo'];
  const documentWrapper = document as any;

  existingDocument.definitions
    .filter((def) => def.kind === 'ObjectTypeDefinition' && def.directives.find((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .forEach((existingObject: ObjectTypeDefinitionNode) => {
      const newObject = document.definitions.find(
        (def) => def.kind === 'ObjectTypeDefinition' && def.name.value === existingObject.name.value,
      ) as ObjectTypeDefinitionNode;
      if (!newObject) {
        return;
      }
      const relationalFields = existingObject.fields.filter((field) =>
        field.directives.find((dir) => RELATIONAL_DIRECTIVES.includes(dir.name.value)),
      );
      const newObjectWrapper = new ObjectDefinitionWrapper(newObject);
      relationalFields.forEach((relationalField: FieldDefinitionNode) => {
        newObjectWrapper.fields.push(new FieldWrapper(relationalField));
      });

      if (relationalFields.length > 0) {
        // If relational fields are found on a model,
        // remove the existing model and add the new one with the relational fields to preserve manual edits.
        const excludedDefinitions = documentWrapper.definitions.filter((def) => def.name.value !== existingObject.name.value);
        documentWrapper.definitions = [...excludedDefinitions, newObjectWrapper.serialize()];
      }
    });

  return documentWrapper;
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
