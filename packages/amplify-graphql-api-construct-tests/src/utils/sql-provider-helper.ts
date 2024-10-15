import * as generator from 'generate-password';
import {
  parse,
  ObjectTypeDefinitionNode,
  Kind,
  visit,
  FieldDefinitionNode,
  StringValueNode,
  valueFromASTUntyped,
  TypeNode,
  ASTVisitor,
} from 'graphql';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { getBaseType, isArrayOrObject, isListType } from 'graphql-transformer-common';

const DIRECTIVE_MODEL = 'model';
const DIRECTIVE_COMPOSITE_KEY = 'key';
const PRIMARY_KEY_DIRECTIVE = 'primaryKey';
const HAS_MANY_DIRECTIVE = 'hasMany';
const HAS_ONE_DIRECTIVE = 'hasOne';
const BELONGS_TO_DIRECTIVE = 'belongsTo';
const DEFAULT_DIRECTIVE = 'default';
const QUERY_TYPE = 'Query';
const MUTATION_TYPE = 'Mutation';

/**
 * Entry point for generating DDL statements from a GraphQL schema.
 */
export const generateDDL = (schema: string, engine: ImportedRDSType = ImportedRDSType.MYSQL): string[] => {
  const document = parse(schema);
  const sqlStatements: string[] = [];

  const schemaVisitor: ASTVisitor = {
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode) => {
        if (!hasDirective(node, DIRECTIVE_MODEL) || node.name.value === QUERY_TYPE || node.name.value === MUTATION_TYPE) {
          return;
        }
        const tableName = getMappedName(node);
        const fieldStatements: string[] = [];
        const primaryKeys: string[] = [];

        node.fields.forEach((field) => {
          if (!isRelationalField(field)) {
            fieldStatements.push(getFieldStatement(field, engine));
          }
          if (isPrimaryKeyField(field)) {
            primaryKeys.push(getMappedName(field));
            const sortKeyFields = getSortKeyFields(field);
            primaryKeys.push(...sortKeyFields);
          }
        });

        // Handle composite keys if defined
        const compositeKeys = getCompositeKeys(node);
        const primaryKeyStatement =
          compositeKeys.length > 0
            ? `PRIMARY KEY (${compositeKeys.map((key) => convertToDBSpecificName(key, engine)).join(', ')})`
            : primaryKeys.length > 0
            ? `PRIMARY KEY (${primaryKeys.map((key) => convertToDBSpecificName(key, engine)).join(', ')})`
            : '';
        const sql = `CREATE TABLE ${convertToDBSpecificName(tableName, engine)} (${[...fieldStatements, primaryKeyStatement]
          .filter(Boolean)
          .join(', ')});`;
        sqlStatements.push(sql);
      },
    },
  };
  visit(document, schemaVisitor);
  return sqlStatements;
};

/**
 * Retrieves the mapped name from a GraphQL definition node.
 */
const getMappedName = (definition: ObjectTypeDefinitionNode | FieldDefinitionNode): string => {
  const name = definition?.name?.value;
  const refersToDirective = definition?.directives?.find((d) => d?.name?.value === 'refersTo');
  if (!refersToDirective) {
    return name;
  }
  const mappedName = (refersToDirective?.arguments?.find((a) => a?.name?.value === 'name')?.value as StringValueNode)?.value;
  return mappedName || name;
};

/**
 * Checks if a field is a relational field (has relations like @hasMany, @hasOne, @belongsTo).
 */
const isRelationalField = (field: FieldDefinitionNode): boolean => {
  return field?.directives?.some((d) => [HAS_MANY_DIRECTIVE, HAS_ONE_DIRECTIVE, BELONGS_TO_DIRECTIVE].includes(d?.name?.value));
};

/**
 * Checks if a field is marked as a primary key.
 */
const isPrimaryKeyField = (field: FieldDefinitionNode): boolean => {
  return field?.directives?.some((d) => d.name.value === PRIMARY_KEY_DIRECTIVE);
};

/**
 * Retrieves sort key fields for a primary key field.
 */
const getSortKeyFields = (field: FieldDefinitionNode): string[] => {
  const primaryKeyDirective = field.directives?.find((d) => d.name.value === PRIMARY_KEY_DIRECTIVE);
  if (!primaryKeyDirective) return [];

  const sortKeyFieldsArg = primaryKeyDirective.arguments?.find((arg) => arg.name.value === 'sortKeyFields');
  const sortKeyFields =
    sortKeyFieldsArg?.value?.kind === Kind.LIST ? sortKeyFieldsArg.value.values.map((v) => (v as StringValueNode).value) : [];
  return sortKeyFields;
};

/**
 * Retrieves composite keys defined in the GraphQL schema.
 */
const getCompositeKeys = (node: ObjectTypeDefinitionNode): string[] => {
  const keyDirective = node.directives?.find((d) => d.name.value === DIRECTIVE_COMPOSITE_KEY);
  if (!keyDirective) return [];

  const fieldsArg = keyDirective.arguments?.find((arg) => arg.name.value === 'fields');
  const fields = fieldsArg?.value?.kind === Kind.LIST ? fieldsArg.value.values.map((v) => (v as StringValueNode).value) : [];
  return fields;
};

/**
 * Generates a SQL field statement for a given field.
 */
const getFieldStatement = (field: FieldDefinitionNode, engine: ImportedRDSType): string => {
  const fieldName = getMappedName(field);
  const fieldType = field.type;
  const isNonNull = fieldType.kind === Kind.NON_NULL_TYPE;
  const baseType = getBaseType(fieldType);
  const hasDefaultDirective = hasDirective(field, DEFAULT_DIRECTIVE);

  // Handle special case for SERIAL type in PostgreSQL
  let columnType;
  if (hasDefaultDirective && engine === ImportedRDSType.POSTGRESQL && baseType === 'Int') {
    columnType = 'SERIAL';
  } else {
    columnType = isArrayOrObject(fieldType, []) ? getArrayOrObjectFieldType(fieldType, engine) : convertToSQLType(baseType);
  }

  // Check if @default is defined on field
  const defaultDir = field.directives.find((dir) => dir.name.value === DEFAULT_DIRECTIVE);
  const defaultValueNode = defaultDir?.arguments?.find((arg) => arg.name.value === 'value');
  const fieldDefaultValue = defaultDir && defaultValueNode ? valueFromASTUntyped(defaultValueNode.value) : undefined;

  const defaultStatement = fieldDefaultValue ? `DEFAULT ${formatDefaultValue(fieldDefaultValue)}` : '';

  return `${convertToDBSpecificName(fieldName, engine)} ${columnType} ${isNonNull ? 'NOT NULL' : ''} ${defaultStatement}`.trim();
};

/**
 * Converts a GraphQL type to a corresponding SQL type.
 */
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
      throw new Error(`Unrecognized GraphQL type: ${type}`);
  }
};

/**
 * Converts a name to a database-specific format.
 */
const convertToDBSpecificName = (name: string, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return name;
    case ImportedRDSType.POSTGRESQL:
      return `"${name}"`;
    default:
      return name;
  }
};

/**
 * Converts a GraphQL name to a database-specific GraphQL string.
 */
export const convertToDBSpecificGraphQLString = (name: string, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return name;
    case ImportedRDSType.POSTGRESQL:
      return `"${name}"`;
    default:
      return name;
  }
};

/**
 * Checks if a node has a specific directive.
 */
const hasDirective = (node: ObjectTypeDefinitionNode | FieldDefinitionNode, directiveName: string): boolean => {
  return node.directives?.some((d) => d.name.value === directiveName) || false;
};

/**
 * Gets the field type for arrays or objects.
 */
const getArrayOrObjectFieldType = (fieldType: TypeNode, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return 'JSON'; // MySQL does not support array types
    case ImportedRDSType.POSTGRESQL:
      return isListType(fieldType) ? 'VARCHAR[]' : 'json';
    default:
      throw new Error(`Unrecognized engine type: ${engine}`);
  }
};

/**
 * Formats default value for SQL statement.
 */
const formatDefaultValue = (value: any): string => {
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  return `${value}`;
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
