import { FieldWrapper, ObjectDefinitionWrapper } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode, EnumTypeDefinitionNode, FieldDefinitionNode, ObjectTypeDefinitionNode, StringValueNode, visit } from 'graphql';
import { getNonModelTypes, isArrayOrObject, isNonNullType, isOfType } from 'graphql-transformer-common';

const MODEL_DIRECTIVE_NAME = 'model';
const REFERS_TO_DIRECTIVE_NAME = 'refersTo';
const RELATIONAL_DIRECTIVES = ['hasOne', 'hasMany', 'belongsTo'];
const AUTH_DIRECTIVE_NAME = 'auth';

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

        const columnName = getMappedName(node);
        const tableName = getMappedName(parentObjectType);
        checkDuplicateFieldMapping(columnName, tableName, existingDocument);
        const correspondingField = findMatchingField(columnName, tableName, existingDocument);
        if (!correspondingField) return;

        // eslint-disable-next-line consistent-return
        return applyFieldOverrides(node, correspondingField);
      },
    },
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode, key, parent, path, ancestors) => {
        const tableName = getMappedName(node);
        checkDuplicateModelMapping(tableName, existingDocument);
        const correspondingModel = findMatchingModel(tableName, existingDocument);
        if (!correspondingModel) return;

        // eslint-disable-next-line consistent-return
        return applyModelOverrides(node, correspondingModel);
      },
    },
  };

  updatedDocument = visit(updatedDocument, schemaVisitor);
  updatedDocument['definitions'] = [
    ...updatedDocument['definitions'],
    ...getNonModelTypes(existingDocument),
    ...getCustomEnumTypes(document, existingDocument),
  ];

  return updatedDocument;
};

const preserveRelationalDirectives = (document: DocumentNode, existingDocument: DocumentNode): DocumentNode => {
  const documentWrapper = document as any;

  existingDocument.definitions
    .filter((def) => def.kind === 'ObjectTypeDefinition' && def.directives.find((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .forEach((existingObject: ObjectTypeDefinitionNode) => {
      const existingTableName = getMappedName(existingObject);
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
        const excludedDefinitions = documentWrapper.definitions.filter((def) => getMappedName(def) !== existingTableName);
        documentWrapper.definitions = [...excludedDefinitions, newObjectWrapper.serialize()];
      }
    });

  return documentWrapper;
};

export const applyFieldOverrides = (field: FieldDefinitionNode, existingField: FieldDefinitionNode): FieldDefinitionNode => {
  return {
    ...field,
    ...applyJSONFieldTypeOverrides(field, existingField),
    ...applyFieldNameOverrides(field, existingField),
  };
};

export const applyModelOverrides = (obj: ObjectTypeDefinitionNode, existingObj: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
  let updatedModel = { ...obj };
  updatedModel = applyModelNameOverrides(obj, existingObj);
  updatedModel = applyModelAuthOverrides(updatedModel, existingObj);
  return updatedModel;
};

export const applyJSONFieldTypeOverrides = (
  field: FieldDefinitionNode,
  existingField: FieldDefinitionNode,
): Partial<FieldDefinitionNode> => {
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
    type: existingField?.type,
  };
};

export const applyModelNameOverrides = (obj: ObjectTypeDefinitionNode, existingObj: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
  const tableName = getMappedName(obj);
  const existingTableName = getMappedName(existingObj);
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

export const applyModelAuthOverrides = (obj: ObjectTypeDefinitionNode, existingObj: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
  const authDirectiveExists = existingObj?.directives?.find((dir) => dir?.name?.value === AUTH_DIRECTIVE_NAME);
  if (!authDirectiveExists) {
    return obj;
  }
  return {
    ...obj,
    ...{
      directives: [
        ...obj?.directives?.filter((dir) => dir.name.value !== AUTH_DIRECTIVE_NAME),
        ...existingObj?.directives?.filter((dir) => dir.name.value === AUTH_DIRECTIVE_NAME),
      ],
    },
  };
};

export const applyFieldNameOverrides = (field: FieldDefinitionNode, existingField: FieldDefinitionNode): Partial<FieldDefinitionNode> => {
  const columnName = getMappedName(field);
  const existingColumnName = getMappedName(existingField);
  const existingFieldName = existingField?.name?.value;

  if (columnName !== existingColumnName && columnName !== existingFieldName) {
    return field;
  }
  const existingFieldIsRelational = existingField?.directives?.find((dir) => RELATIONAL_DIRECTIVES.includes(dir?.name?.value));
  const existingFieldHasRefersTo = existingField?.directives?.find((dir) => dir?.name?.value === REFERS_TO_DIRECTIVE_NAME);
  if (existingFieldIsRelational && existingFieldHasRefersTo) {
    throw new Error(`Field "${existingFieldName}" cannot be renamed because it is a relational field.`);
  }
  if (columnName === existingFieldName) {
    // In this case, there is no need for refersTo since edits were made to keep the original field name.
    // For example, post: Post @refersTo(name: "posts") -> field posts: Post
    return {
      ...{ name: existingField?.name },
      ...{ directives: field?.directives?.filter((dir) => dir.name.value !== REFERS_TO_DIRECTIVE_NAME) },
    };
  }
  // In this case, keep the edited name and refersTo directive if it exists.
  // For example, post: Post @refersTo(name: "posts") -> myPost: Post @refersTo(name: "posts")
  // Or post: Post -> myPost: Post @refersTo(name: "post")
  return {
    ...{ name: existingField?.name },
    ...{
      directives: [
        ...existingField?.directives?.filter((dir) => dir.name.value === REFERS_TO_DIRECTIVE_NAME),
        ...field?.directives?.filter((dir) => dir.name.value !== REFERS_TO_DIRECTIVE_NAME),
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
    console.warn(
      `The field ${field?.name?.value} has been changed to an optional type while it is required in the database. This may result in SQL errors in the mutations.`,
    );
  }
};

const getMappedName = (node: ObjectTypeDefinitionNode | FieldDefinitionNode): string => {
  const nodeName = node?.name?.value;
  const refersToDirective = node.directives.find((dir) => dir.name.value === REFERS_TO_DIRECTIVE_NAME);
  if (!refersToDirective) {
    return nodeName;
  }
  const mappedName = refersToDirective?.arguments?.find((arg) => arg?.name?.value === 'name');
  if (!mappedName) {
    return nodeName;
  }
  return (mappedName?.value as StringValueNode)?.value;
};

const findMatchingModel = (tableName: string, existingDocument: DocumentNode): ObjectTypeDefinitionNode | undefined => {
  const matchedModel = existingDocument.definitions.find(
    (def) =>
      def?.kind === 'ObjectTypeDefinition' &&
      def?.directives?.find((dir) => dir?.name?.value === MODEL_DIRECTIVE_NAME) &&
      (def?.name?.value === tableName || getMappedName(def) === tableName),
  );
  if (matchedModel) {
    return matchedModel as ObjectTypeDefinitionNode;
  }
};

export const findMatchingField = (columnName: string, taleName: string, document: DocumentNode): FieldDefinitionNode | undefined => {
  const matchingObject = findMatchingModel(taleName, document);
  if (!matchingObject) {
    return;
  }
  return matchingObject?.fields?.find((field) => field?.name?.value === columnName || getMappedName(field) === columnName);
};

const checkDuplicateModelMapping = (tableName: string, document: DocumentNode) => {
  const matchedTypes = document.definitions.filter(
    (def) => def?.kind === 'ObjectTypeDefinition' && (def?.name?.value === tableName || getMappedName(def) === tableName),
  );
  if (matchedTypes?.length > 1) {
    throw new Error(
      `Types ${matchedTypes
        .map((type) => (type as ObjectTypeDefinitionNode)?.name?.value)
        .join(', ')} are mapped to the same table ${tableName}. Remove the duplicate mapping.`,
    );
  }
};

const checkDuplicateFieldMapping = (columnName: string, tableName: string, document: DocumentNode) => {
  const matchingObject = findMatchingModel(tableName, document);
  if (!matchingObject) {
    return;
  }
  const matchedFields = matchingObject?.fields?.filter((def) => def?.name?.value === columnName || getMappedName(def) === columnName);
  if (matchedFields?.length > 1) {
    throw new Error(
      `Fields ${matchedFields
        .map((field) => field?.name?.value)
        .join(', ')} are mapped to the same column ${columnName}. Remove the duplicate mapping.`,
    );
  }
};

const getCustomEnumTypes = (document: DocumentNode, existingDocument: DocumentNode): EnumTypeDefinitionNode[] => {
  // Get all the enum types that are added to the existing schema for the purpose of custom operations.
  const existingEnumTypes = getEnumTypes(existingDocument);
  const newEnumTypes = getEnumTypes(document);
  return existingEnumTypes.filter((existingEnum) => !newEnumTypes.find((newEnum) => newEnum?.name?.value === existingEnum?.name?.value));
};

const getEnumTypes = (document: DocumentNode): EnumTypeDefinitionNode[] => {
  return document.definitions.filter((def) => def.kind === 'EnumTypeDefinition').map((def) => def as EnumTypeDefinitionNode);
};
