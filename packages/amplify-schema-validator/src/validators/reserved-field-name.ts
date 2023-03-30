import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
   * Reserved words are not used in field names
   *
   * @param schema graphql schema
   * @returns true if reserved words are not used in field names
   */
export const validateReservedFieldNames = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const reservedWords = ['_version', '_changedAt', '_deleted'];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const { fields } = objectTypeDefinition;

    fields?.forEach((field) => {
      const fieldName = field.name.value;
      if (reservedWords.includes(fieldName)) {
        errors.push(new ValidationError(
          `${fieldName} is a reserved word and cannnot be used as a field name.`,
        ));
      }
    });
  });
  return errors;
};
