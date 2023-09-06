import { DocumentNode, FieldDefinitionNode, ObjectTypeDefinitionNode, StringValueNode, visit } from 'graphql';
import { isArrayOrObject, findMatchingField, getNonModelTypes, isOfType, isNonNullType } from 'graphql-transformer-common';
import { printer } from '@aws-amplify/amplify-prompts';
import { FieldWrapper, ObjectDefinitionWrapper } from '@aws-amplify/graphql-transformer-core';

const MODEL_DIRECTIVE_NAME = 'model';
const REFERS_TO_DIRECTIVE_NAME = 'refersTo';

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
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode, key, parent, path, ancestors) => {
        const tableName = getTableName(node);
        const correspondingModel = findMatchingModel(tableName, existingDocument);
        if (!correspondingModel) return;

        // eslint-disable-next-line consistent-return
        return applyModelOverrides(node, correspondingModel);
      },
    },
  };

  updatedDocument = visit(updatedDocument, schemaVisitor);
  updatedDocument['definitions'] = [...updatedDocument['definitions'], ...getNonModelTypes(existingDocument)];

  return updatedDocument;
};

const preserveRelationalDirectives = (document: DocumentNode, existingDocument: DocumentNode): DocumentNode => {
  const RELATIONAL_DIRECTIVES = ['hasOne', 'hasMany', 'belongsTo'];
  const documentWrapper = document as any;

  existingDocument.definitions
    .filter((def) => def.kind === 'ObjectTypeDefinition' && def.directives.find((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .forEach((existingObject: ObjectTypeDefinitionNode) => {
      const existingTableName = getTableName(existingObject);
      const newObject = findMatchingModel(existingTableName, document);
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
        const excludedDefinitions = documentWrapper.definitions.filter((def) => getTableName(def) !== existingTableName);
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

export const applyModelOverrides = (obj: ObjectTypeDefinitionNode, existingObj: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
  return {
    ...obj,
    ...applyModelNameOverrides(obj, existingObj),
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

export const applyModelNameOverrides = (obj: ObjectTypeDefinitionNode, existingObj: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
  const tableName = getTableName(obj);
  const existingTableName = getTableName(existingObj);
  const existingTypeName = existingObj?.name?.value;

  if (tableName !== existingTableName && tableName !== existingTypeName) {
    return obj;
  }
  if (tableName === existingTypeName) {
    // In this case, there is no need for refersTo since edits were made to keep the original table name as type name.
    // For example, type Post @refersTo(name: "posts") -> type posts
    return {
      ...obj,
      ...{ name: existingObj?.name },
      ...{ directives: obj?.directives?.filter((dir) => dir.name.value !== REFERS_TO_DIRECTIVE_NAME) },
    };
  }
  // In this case, keep the edited name and refersTo directive if it exists.
  // For example, type Post @refersTo(name: "posts") -> type MyPost @refersTo(name: "posts")
  // Or type Post -> type MyPost @refersTo(name: "Post")
  return {
    ...obj,
    ...{ name: existingObj?.name },
    ...{
      directives: [
        ...existingObj?.directives?.filter((dir) => dir.name.value === REFERS_TO_DIRECTIVE_NAME),
        ...obj?.directives?.filter((dir) => dir.name.value !== REFERS_TO_DIRECTIVE_NAME),
      ],
    },
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

const getTableName = (object: ObjectTypeDefinitionNode): string => {
  const refersToDirective = object.directives.find((dir) => dir.name.value === REFERS_TO_DIRECTIVE_NAME);
  if (!refersToDirective) {
    return object?.name?.value;
  }
  const tableName = refersToDirective?.arguments?.find((arg) => arg?.name?.value === 'name');
  if (!tableName) {
    return object?.name?.value;
  }
  return (tableName?.value as StringValueNode)?.value;
};

const findMatchingModel = (tableName: string, existingDocument: DocumentNode): ObjectTypeDefinitionNode | undefined => {
  const matchedModel = existingDocument.definitions.find(
    (def) =>
      def?.kind === 'ObjectTypeDefinition' &&
      def?.directives?.find((dir) => dir?.name?.value === MODEL_DIRECTIVE_NAME) &&
      (def?.name?.value === tableName || getTableName(def) === tableName),
  );
  if (matchedModel) {
    return matchedModel as ObjectTypeDefinitionNode;
  }
};
