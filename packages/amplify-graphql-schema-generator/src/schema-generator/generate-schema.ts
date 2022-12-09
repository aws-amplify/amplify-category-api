import { Field, Index, Model, Schema } from '../schema-representation';
import { Kind, print } from 'graphql';
import { FieldWrapper, ObjectDefinitionWrapper, DirectiveWrapper } from '@aws-amplify/graphql-transformer-core';

export const generateGraphQLSchema = (schema: Schema): string => {
  const models = schema.getModels();
  const document: any = {
    kind: Kind.DOCUMENT,
    definitions: [],
  };

  models.forEach(model => {
    const type = constructObjectType(model);
    
    const fields = model.getFields();
    fields.forEach(f => {
      const field: any = convertInternalFieldTypeToGraphQL(f);
      type.fields.push(field);
    });
    
    addPrimaryKey(type, model.getPrimaryKey());
    addIndexes(type, model.getIndexes());

    document.definitions.push(type.serialize());
  });

  const schemaStr = print(document);
  return schemaStr;
};

const convertInternalFieldTypeToGraphQL = (field: Field): FieldWrapper => {
  const typeWrappers = [];
  let fieldType = field.type;
  while (fieldType.kind !== "Scalar" && fieldType.kind !== "Custom") {
    typeWrappers.push(fieldType.kind);
    fieldType = (fieldType as any).type;
  }

  // construct the default directive
  const fieldDirectives = [];
  if (field.default) {
    fieldDirectives.push(new DirectiveWrapper({
      kind: Kind.DIRECTIVE,
      name: {
        kind: "Name",
        value: "default",
      },
      arguments: [
        {
          kind: "Argument",
          name: {
            kind: "Name",
            value: "value",
          },
          value: {
            kind: "StringValue",
            value: field.default.value as string,
          },              
        },
      ],
    }));
  }

  // Construct the field wrapper object
  const result = new FieldWrapper({
    kind: "FieldDefinition",
    name: {
      kind: "Name",
      value: field.name,
    },
    type: {
      kind: "NamedType",
      name: {
        kind: "Name",
        value: fieldType.name,
      },
    },
    directives: fieldDirectives,
  });

  while (typeWrappers.length > 0) {
    const wrapperType = typeWrappers.pop();
    if (wrapperType === "List") {
      result.wrapListType();
    } else if (wrapperType === "NonNull") {
      result.makeNonNullable();
    }
  }

  return result;
};

const constructObjectType = (model: Model) => {
  return new ObjectDefinitionWrapper({
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: {
      kind: "Name",
      value: model.getName(),
    },
    fields: [],
    directives: [
      {
        kind: Kind.DIRECTIVE,
        name: {
          kind: "Name",
          value: "model",
        },
      },
    ],
  });
};

const addIndexes = (type: ObjectDefinitionWrapper, indexes: Index[]): void => {
  indexes.forEach(index => {
    const firstField = index.getFields()[0];
    const indexField = type.getField(firstField);
    
    const indexArguments = [];
    indexArguments.push(
      {
        kind: "Argument",
        name: {
          kind: "Name",
          value: "name",
        },
        value: {
          kind: "StringValue",
          value: index.name,
        },
      },
    );

    if (index.getFields().length > 1) {
      indexArguments.push(
        {
          kind: "Argument",
          name: {
            kind: "Name",
            value: "sortKeyFields",
          },
          value: {
            kind: "ListValue",
            values: index.getFields().slice(1).map(k => {
              return {
                kind: "StringValue",
                value: k,
              };
            }),
          },            
        },
      )
    }

    indexField.directives.push(
      new DirectiveWrapper({
        kind: Kind.DIRECTIVE,
        name: {
          kind: "Name",
          value: "index",
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
    keyArguments.push(
      {
        kind: "Argument",
        name: {
          kind: "Name",
          value: "sortKeyFields",
        },
        value: {
          kind: "ListValue",
          values: primaryKey.getFields().slice(1).map(k => {
            return {
              kind: "StringValue",
              value: k,
            };
          }),
        },           
      },
    );
  }

  primaryKeyField.directives.push(
    new DirectiveWrapper({
      kind: Kind.DIRECTIVE,
      name: {
        kind: "Name",
        value: "primaryKey",
      },
      arguments: keyArguments,
    }),
  );
};
