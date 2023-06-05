import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
 * Type is defined once in the schema
 *
 * @param schema graphql schema
 * @returns true if a type is defined once in the schema
 */

/**
 *
 * @param schema
 */
export const validateTypeIsDefinedOnce = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];

  const uniqueTypes: string[] = [];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    if (!uniqueTypes.includes(objectName)) {
      uniqueTypes.push(objectName);
    } else {
      errors.push(new ValidationError(
        `Schema validation failed. There can be only one type named ${objectName}.`,
      ));
    }
  });
  return errors;
};
