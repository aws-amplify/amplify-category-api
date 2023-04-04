import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
 * Reserved words are not used in type names
 *
 * @param schema graphql schema
 * @returns true if reserved words are not used in type names
 */

export const validateReservedTypeNames = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const reservedWords = ['Query', 'Mutation', 'Subscription'];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    if (reservedWords.includes(objectName)) {
      errors.push(new ValidationError(
        `${objectName} is a reserved type name and currently in use within the default schema element.`,
      ));
    }
  });
  return errors;
};
