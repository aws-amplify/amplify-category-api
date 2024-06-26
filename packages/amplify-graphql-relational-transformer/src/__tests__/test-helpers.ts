import { getBaseType } from 'graphql-transformer-common';
import { DirectiveNode, DocumentNode } from 'graphql';

export const hasGeneratedField = (
  doc: DocumentNode,
  objectType: string,
  fieldName: string,
  fieldType?: string,
  isList?: boolean,
): boolean => {
  let hasField = false;
  doc?.definitions?.forEach((def) => {
    if ((def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension') && def.name.value === objectType) {
      def?.fields?.forEach((field) => {
        if (field.name.value === fieldName) {
          hasField = true;
          const listTypeTrue = field.type.kind === 'ListType' || (field.type.kind === 'NonNullType' && field.type.type.kind === 'ListType');
          if (isList === true && listTypeTrue) {
            hasField = hasField && true;
          }
          if (isList === false && listTypeTrue) {
            hasField = false;
          }
          if (fieldType && getBaseType(field.type) === fieldType) {
            hasField = hasField && true;
          }
        }
      });
    }
  });
  return hasField;
};

export const hasGeneratedDirective = (
  doc: DocumentNode,
  objectType: string,
  fieldName: string | undefined,
  dirName: string,
  args: Map<string, string | Array<string> | object> | undefined,
): boolean => {
  let matchesExpected = false;

  doc?.definitions?.forEach((def) => {
    if ((def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension') && def.name.value === objectType) {
      if (fieldName) {
        def?.fields?.forEach((field) => {
          field?.directives?.forEach((dir) => {
            if (dir.name.value === dirName) {
              matchesExpected = matchesExpected ? true : checkDirective(dir, args);
            }
          });
        });
      } else {
        def?.directives?.forEach((dir) => {
          if (dir.name.value === dirName) {
            matchesExpected = matchesExpected ? true : checkDirective(dir, args);
          }
        });
      }
    }
  });
  return matchesExpected;
};

// This is only written to support the string and string list arguments of the relational directives
const checkDirective = (dir: DirectiveNode, expectedArgs: Map<string, string | Array<string>> | undefined): boolean => {
  if (!expectedArgs && !dir.arguments) {
    return true;
  }
  dir?.arguments?.forEach((arg) => {
    if (arg.value.kind === 'StringValue') {
      if (expectedArgs?.get(arg.name.value) === arg.value.value) {
        expectedArgs?.delete(arg.name.value);
      }
    } else if (arg.value.kind === 'ListValue') {
      const stringValues = expectedArgs?.get(arg.name.value);
      let fullMatch = true;
      arg.value.values.forEach((val, idx) => {
        if (val.kind !== 'StringValue' || val.value !== stringValues?.[idx]) {
          fullMatch = false;
        }
      });
      if (fullMatch) {
        expectedArgs?.delete(arg.name.value);
      }
    }
  });

  if (expectedArgs?.size && expectedArgs?.size > 0) {
    return false;
  }
  return true;
};
