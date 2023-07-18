import {
  DirectiveWrapper, EnumWrapper,
  FieldWrapper, ObjectDefinitionWrapper,
} from '@aws-amplify/graphql-transformer-core';
import { EnumValueDefinitionNode, Kind, print } from 'graphql';
import {
  EnumType,
  Field,
  Index,
  Model,
  Schema,
} from '../schema-representation';

export const generateGraphQLSchema = (schema: Schema): string => {
  const models = schema.getModels();
  const document: any = {
    kind: Kind.DOCUMENT,
    definitions: [],
  };

  models.forEach((model) => {
    const primaryKey = model.getPrimaryKey();
    if (!primaryKey) {
      return;
    }

    const type = constructObjectType(model);
    const fields = model.getFields();
    const primaryKeyFields = primaryKey?.getFields();
    fields.forEach((f) => {
      if (f.type.kind === 'Enum') {
        const enumType = constructEnumType(f.type);
        document.definitions.push(enumType.serialize());
      }

      const field: any = convertInternalFieldTypeToGraphQL(f, primaryKeyFields.includes(f.name));
      type.fields.push(field);
    });

    addPrimaryKey(type, model.getPrimaryKey());
    addIndexes(type, model.getIndexes());

    document.definitions.push(type.serialize());
  });

  const schemaStr = print(document);
  return schemaStr;
};

const convertInternalFieldTypeToGraphQL = (field: Field, isPrimaryKeyField: boolean): FieldWrapper => {
  const typeWrappers = [];
  let fieldType = field.type;
  while (fieldType.kind !== 'Scalar' && fieldType.kind !== 'Custom' && fieldType.kind !== 'Enum') {
    typeWrappers.push(fieldType.kind);
    fieldType = (fieldType as any).type;
  }

  // construct the default directive
  const fieldDirectives = [];
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
      value: field.name,
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
  return new ObjectDefinitionWrapper({
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: {
      kind: 'Name',
      value: model.getName(),
    },
    fields: [],
    directives: [
      {
        kind: Kind.DIRECTIVE,
        name: {
          kind: 'Name',
          value: 'model',
        },
      },
    ],
  });
};

const constructEnumType = (type: EnumType) => {
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

const addIndexes = (type: ObjectDefinitionWrapper, indexes: Index[]): void => {
  indexes.forEach((index) => {
    const firstField = index.getFields()[0];
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
                value: k,
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

  const firstField = primaryKey.getFields()[0];
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
              value: k,
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
