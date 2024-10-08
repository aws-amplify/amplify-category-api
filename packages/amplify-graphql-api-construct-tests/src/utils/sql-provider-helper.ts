import * as generator from 'generate-password';
import { parse, ObjectTypeDefinitionNode, Kind, visit, FieldDefinitionNode, StringValueNode, valueFromASTUntyped, TypeNode } from 'graphql';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { getBaseType, isArrayOrObject, isListType, toPascalCase } from 'graphql-transformer-common';

const HAS_MANY_DIRECTIVE = 'hasMany';
const HAS_ONE_DIRECTIVE = 'hasOne';
const BELONGS_TO_DIRECTIVE = 'belongsTo';

export const convertToDBSpecificGraphQLString = (name: string, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return name;
    case ImportedRDSType.POSTGRESQL:
      return `\\"\\"${name}\\"\\"`;
    default:
      return name;
  }
};

export const convertToDBSpecificName = (name: string, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return name;
    case ImportedRDSType.POSTGRESQL:
      return `"${name}"`;
    default:
      return name;
  }
};

export const generateDDL = (schema: string, engine: ImportedRDSType = ImportedRDSType.MYSQL): string[] => {
  const document = parse(schema);
  const sqlStatements = [];
  const schemaVisitor = {
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode, key, parent, path, ancestors) => {
        if (!node?.directives?.some((d) => d?.name?.value === 'model')) {
          return;
        }
        const tableName = getMappedName(node);
        const fieldStatements = [];
        const fieldsToAdd = node.fields.filter((field) => !isRelationalField(field));
        fieldsToAdd.forEach((field, index) => {
          fieldStatements.push(getFieldStatement(field, index === 0, engine));
        });
        const sql = `CREATE TABLE ${convertToDBSpecificName(tableName, engine)} (${fieldStatements.join(', ')});`;
        sqlStatements.push(sql);
      },
    },
  };
  visit(document, schemaVisitor);
  return sqlStatements;
};

const getMappedName = (definition: ObjectTypeDefinitionNode | FieldDefinitionNode): string => {
  const name = definition?.name?.value;
  const refersToDirective = definition?.directives?.find((d) => d?.name?.value === 'refersTo');
  if (!refersToDirective) {
    return name;
  }
  const mappedName = (refersToDirective?.arguments?.find((a) => a?.name?.value === 'name')?.value as StringValueNode)?.value;
  if (!mappedName) {
    return name;
  }
  return mappedName;
};

const isRelationalField = (field: FieldDefinitionNode): boolean => {
  return field?.directives?.some((d) => [HAS_MANY_DIRECTIVE, HAS_ONE_DIRECTIVE, BELONGS_TO_DIRECTIVE].includes(d?.name?.value));
};

const getFieldStatement = (field: FieldDefinitionNode, isPrimaryKey: boolean, engine: ImportedRDSType): string => {
  const fieldName = getMappedName(field);
  const fieldType = field.type;
  const isNonNull = fieldType.kind === Kind.NON_NULL_TYPE;
  const baseType = getBaseType(fieldType);
  const columnType = isArrayOrObject(fieldType, []) ? getArrayOrObjectFieldType(fieldType, engine) : convertToSQLType(baseType);
  // Check if @default is defined on field
  const defaultDir = field.directives.find((dir) => dir.name.value === 'default');
  const defaultValueNode = defaultDir?.arguments.find((arg) => arg.name.value === 'value');
  const fieldDefaultValue = defaultDir && defaultValueNode ? valueFromASTUntyped(defaultValueNode.value) : undefined;
  const sql = `${convertToDBSpecificName(fieldName, engine)} ${columnType} ${isNonNull ? 'NOT NULL' : ''} ${
    isPrimaryKey ? 'PRIMARY KEY' : ''
  } ${fieldDefaultValue ? `DEFAULT ${fieldDefaultValue}` : ''}`;
  return sql;
};

const getArrayOrObjectFieldType = (fieldType: TypeNode, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return 'JSON'; // MySQL does not support array types
    case ImportedRDSType.POSTGRESQL:
      return isListType(fieldType) ? 'VARCHAR[]' : 'json';
    default:
      return 'VARCHAR[]';
  }
};

const convertToSQLType = (type: string): string => {
  switch (type) {
    case 'ID':
    case 'String':
      return 'VARCHAR(255)';
    case 'Int':
      return 'INT';
    case 'Float':
      return 'FLOAT';
    case 'Boolean':
      return 'BOOLEAN';
    case 'AWSDateTime':
      return 'DATETIME';
    default:
      return 'VARCHAR(255)';
  }
};

export const getRDSTableNamePrefix = (): string => {
  return 'e2e_test_';
};

export const getUserGroupNames = (): string[] => {
  return generator.generateMultiple(2, {
    length: 5,
    lowercase: true,
    strict: true,
    uppercase: true,
  });
};

export const userGroupNames = getUserGroupNames();
