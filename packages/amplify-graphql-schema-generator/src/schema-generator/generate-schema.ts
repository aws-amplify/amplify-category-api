import { DirectiveWrapper, EnumWrapper, FieldWrapper, ObjectDefinitionWrapper } from '@aws-amplify/graphql-transformer-core';
import {
  EnumValueDefinitionNode,
  Kind,
  print,
  DocumentNode,
  InputObjectTypeDefinitionNode,
  ListValueNode,
  StringValueNode,
  DirectiveNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { EnumType, Field, FieldType, Index, Model, Schema } from '../schema-representation';
import { applySchemaOverrides } from './schema-overrides';
import { singular } from 'pluralize';
import { toCamelCase, toPascalCase } from 'graphql-transformer-common';

export const generateGraphQLSchema = (schema: Schema, existingSchemaDocument?: DocumentNode | undefined): string => {
  const models = schema.getModels();
  const document: any = {
    kind: Kind.DOCUMENT,
    definitions: [],
  };

  const { includeTables, excludeTables } = getIncludeExcludeConfig(existingSchemaDocument);

  models.forEach((model) => {
    // Verify whether a table should be included or excluded
    if (includeTables.length > 0 && !includeTables.includes(model.getName())) {
      return;
    }
    if (excludeTables.length > 0 && excludeTables.includes(model.getName())) {
      return;
    }

    const primaryKey = model.getPrimaryKey();
    if (!primaryKey) {
      return;
    }

    const type = constructObjectType(model);
    const fields = model.getFields();
    const primaryKeyFields = primaryKey?.getFields();
    fields.forEach((f) => {
      if (isEnum(f.type)) {
        const enumType = constructEnumType(getBaseType(f.type) as EnumType);
        if (!document.definitions.find((d) => d.name.value === enumType.name)) {
          document.definitions.push(enumType.serialize());
        }
      }

      const field: any = convertInternalFieldTypeToGraphQL(f, primaryKeyFields.includes(f.name));
      type.fields.push(field);
    });

    addPrimaryKey(type, model.getPrimaryKey());
    addIndexes(type, model.getIndexes());

    document.definitions.push(type.serialize());
  });

  const documentWithOverrides = applySchemaOverrides(document as DocumentNode, existingSchemaDocument);
  const schemaStr = printSchema(documentWithOverrides);
  return schemaStr;
};

const isEnum = (type: FieldType): boolean => {
  if (type.kind === 'NonNull' || type.kind === 'List') {
    return isEnum(type.type);
  }
  return type.kind === 'Enum';
};

const getBaseType = (type: FieldType): FieldType => {
  if (type.kind === 'NonNull' || type.kind === 'List') {
    return getBaseType(type.type);
  }
  return type;
};

const convertInternalFieldTypeToGraphQL = (field: Field, isPrimaryKeyField: boolean): FieldWrapper => {
  const fieldName = field.name;
  const typeWrappers = [];
  let fieldType = field.type;
  while (fieldType.kind !== 'Scalar' && fieldType.kind !== 'Custom' && fieldType.kind !== 'Enum') {
    typeWrappers.push(fieldType.kind);
    fieldType = (fieldType as any).type;
  }

  const fieldDirectives = [];

  // construct the refersTo directive
  const fieldTypeName = convertToGraphQLFieldName(fieldName);
  const fieldNameNeedsMapping = fieldTypeName !== fieldName;
  if (fieldNameNeedsMapping) {
    const fieldNameMappingDirective = getRefersToDirective(fieldName);
    fieldDirectives.push(fieldNameMappingDirective);
  }

  // construct the default directive
  const fieldHasDefaultValue = field?.default && field?.default?.value;
  const fieldIsOptional = fieldHasDefaultValue && !isPrimaryKeyField;
  if (fieldHasDefaultValue) {
    const defaultStringValue = String(field.default.value);
    if (!isComputeExpression(defaultStringValue)) {
      fieldDirectives.push(
        new DirectiveWrapper({
          kind: Kind.DIRECTIVE,
          name: {
            kind: 'Name',
            value: 'default',
          },
          arguments: [
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'value',
              },
              value: {
                kind: 'StringValue',
                value: defaultStringValue,
              },
            },
          ],
        }),
      );
    }
  }

  // Construct the field wrapper object
  const result = new FieldWrapper({
    kind: 'FieldDefinition',
    name: {
      kind: 'Name',
      value: fieldTypeName,
    },
    type: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: fieldType.name,
      },
    },
    directives: fieldDirectives,
  });

  while (typeWrappers.length > 0) {
    const wrapperType = typeWrappers.pop();
    if (wrapperType === 'List') {
      result.wrapListType();
    } else if (wrapperType === 'NonNull' && !fieldIsOptional) {
      result.makeNonNullable();
    }
  }

  return result;
};

const constructObjectType = (model: Model) => {
  const modelName = model.getName();
  const directives = [];

  const modelTypeName = convertToGraphQLTypeName(modelName);
  const modelNameNeedsMapping = modelTypeName !== modelName;
  if (modelNameNeedsMapping) {
    const modelNameMappingDirective = getRefersToDirective(modelName);
    directives.push(modelNameMappingDirective);
  }

  const modelDirective = {
    kind: Kind.DIRECTIVE,
    name: {
      kind: 'Name',
      value: 'model',
    },
  } as DirectiveNode;
  directives.push(modelDirective);

  return new ObjectDefinitionWrapper({
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: {
      kind: 'Name',
      value: modelTypeName,
    },
    fields: [],
    directives: directives,
  });
};

const constructEnumType = (type: EnumType): EnumWrapper => {
  // Check if the enum values imported from the database contain any invalid character.
  // Enum can contain A-Z, a-z, 0-9 or underscore(_) and must begin with an alphabet or an underscore(_).
  if (!validateEnumValues(type.values)) {
    throw new Error(
      `Enum "${type.name}" (values: ${type.values.join(
        ',',
      )}) contains one or more invalid values. Enum values can contain A-Z, a-z, 0-9 or underscore(_) and must begin with an alphabet or an underscore(_).`,
    );
  }
  const enumValues = type.values.map((t) => {
    return {
      kind: Kind.ENUM_VALUE_DEFINITION,
      name: {
        kind: 'Name',
        value: t,
      },
    } as EnumValueDefinitionNode;
  });
  const enumType = new EnumWrapper({
    kind: Kind.ENUM_TYPE_DEFINITION,
    name: {
      kind: 'Name',
      value: type.name,
    },
    values: enumValues,
  });
  return enumType;
};

const validateEnumValues = (values: string[]): boolean => {
  const regex = new RegExp(/^[_A-Za-z][_0-9A-Za-z]*$/);
  const containsValidValues = values.every((value) => regex.test(value));
  return containsValidValues;
};

const addIndexes = (type: ObjectDefinitionWrapper, indexes: Index[]): void => {
  indexes.forEach((index) => {
    const firstField = convertToGraphQLFieldName(index.getFields()[0]);
    const indexField = type.getField(firstField);

    const indexArguments = [];
    indexArguments.push({
      kind: 'Argument',
      name: {
        kind: 'Name',
        value: 'name',
      },
      value: {
        kind: 'StringValue',
        value: index.name,
      },
    });

    if (index.getFields().length > 1) {
      indexArguments.push({
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: 'sortKeyFields',
        },
        value: {
          kind: 'ListValue',
          values: index
            .getFields()
            .slice(1)
            .map((k) => {
              return {
                kind: 'StringValue',
                value: convertToGraphQLFieldName(k),
              };
            }),
        },
      });
    }

    indexField.directives.push(
      new DirectiveWrapper({
        kind: Kind.DIRECTIVE,
        name: {
          kind: 'Name',
          value: 'index',
        },
        arguments: indexArguments,
      }),
    );
  });
};

const addPrimaryKey = (type: ObjectDefinitionWrapper, primaryKey: Index): void => {
  if (!primaryKey) {
    return;
  }

  const firstField = convertToGraphQLFieldName(primaryKey.getFields()[0]);
  const primaryKeyField = type.getField(firstField);
  const keyArguments = [];

  if (primaryKey.getFields().length > 1) {
    keyArguments.push({
      kind: 'Argument',
      name: {
        kind: 'Name',
        value: 'sortKeyFields',
      },
      value: {
        kind: 'ListValue',
        values: primaryKey
          .getFields()
          .slice(1)
          .map((k) => {
            return {
              kind: 'StringValue',
              value: convertToGraphQLFieldName(k),
            };
          }),
      },
    });
  }

  primaryKeyField.directives.push(
    new DirectiveWrapper({
      kind: Kind.DIRECTIVE,
      name: {
        kind: 'Name',
        value: 'primaryKey',
      },
      arguments: keyArguments,
    }),
  );
};

type IncludeExcludeConfig = {
  includeTables: string[];
  excludeTables: string[];
};

const getIncludeExcludeConfig = (document: DocumentNode | undefined): IncludeExcludeConfig => {
  const emptyConfig = { includeTables: [], excludeTables: [] };
  if (!document) {
    return emptyConfig;
  }

  const amplifyInputType = document.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'AMPLIFY',
  ) as InputObjectTypeDefinitionNode;
  if (!amplifyInputType) {
    return emptyConfig;
  }

  const includeFieldNodeValue = amplifyInputType.fields.find((f) => f.name.value === 'include')?.defaultValue;
  const excludeFieldNodeValue = amplifyInputType.fields.find((f) => f.name.value === 'exclude')?.defaultValue;

  if (includeFieldNodeValue && includeFieldNodeValue.kind !== 'ListValue') {
    throw new Error('Invalid value for include option. Please check your GraphQL schema.');
  }

  if (excludeFieldNodeValue && excludeFieldNodeValue.kind !== 'ListValue') {
    throw new Error('Invalid value for include option. Please check your GraphQL schema.');
  }

  const includeTables = (includeFieldNodeValue as ListValueNode)?.values.map((v: StringValueNode) => v.value);
  const excludeTables = (excludeFieldNodeValue as ListValueNode)?.values.map((v: StringValueNode) => v.value);
  if (includeTables && includeTables.length > 0 && excludeTables && excludeTables.length > 0) {
    throw new Error('Cannot specify both include and exclude options. Please check your GraphQL schema.');
  }

  return {
    includeTables: includeTables || [],
    excludeTables: excludeTables || [],
  };
};

/**
 * Checks if the user defined default for a field is a compute expression
 * @param value The default value for a field
 * @returns if the default value is a compute expression like for example (RAND() * RAND()))
 */
export const isComputeExpression = (value: string) => {
  /* As per MySQL 8.x, 
    Complex computed expression default values like "(RAND() * RAND())" are enclosed within parentheses.
    Simple computed expression default values like "RAND()" are not. 
    These functions could have one or more arguments too, like "COS(PI())".
  */
  const isSimpleComputedExpression = value.match(/^[a-zA-Z0-9]+\(.*\)/);
  const isComplexComputedExpression = value.match(/^\([a-zA-Z0-9]+\(.*\)\)/);
  if (isSimpleComputedExpression || isComplexComputedExpression) {
    return true;
  }
  return false;
};

export const getRefersToDirective = (name: string): DirectiveNode => {
  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: 'Name',
      value: 'refersTo',
    },
    arguments: [
      {
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: 'name',
        },
        value: {
          kind: 'StringValue',
          value: name,
        },
      },
    ],
  } as DirectiveNode;
};

export const convertToGraphQLTypeName = (modelName: string): string => {
  const cleanedInput = cleanMappedName(modelName);

  // Convert to PascalCase and Singularize
  return singular(toPascalCase(cleanedInput?.split('_')));
};

export const convertToGraphQLFieldName = (fieldName: string): string => {
  const cleanedInput = cleanMappedName(fieldName, true);

  // Convert to camelCase
  return toCamelCase(cleanedInput?.split('_'));
};

const cleanMappedName = (name: string, isField: boolean = false): string => {
  // If it does not have any alphabetic characters, use a meaningful name
  if (!name?.match(/[a-zA-Z]/)) {
    const suffix = name?.replace(/[^0-9]+/g, '');
    return isField ? `field${suffix}` : `Model${suffix}`;
  }

  // Remove leading digits and non-alphabetic characters
  // Convert non-alphanumeric characters to underscores
  const cleanedInput = name
    .replace(/^[^a-zA-Z]+/, '')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .trim();

  return cleanedInput;
};

export const printSchema = (document: DocumentNode): string => {
  const sortedDocument = sortDocument(document);
  return print(sortedDocument);
};

const sortDocument = (document: DocumentNode): DocumentNode => {
  const documentWrapper = document as any;
  documentWrapper.definitions = [...document?.definitions].sort((def1, def2) => {
    if ((def1 as ObjectTypeDefinitionNode)?.name?.value > (def2 as ObjectTypeDefinitionNode)?.name?.value) {
      return 1;
    }
    if ((def1 as ObjectTypeDefinitionNode)?.name?.value < (def2 as ObjectTypeDefinitionNode)?.name?.value) {
      return -1;
    }
    return 0;
  });
  return documentWrapper;
};
