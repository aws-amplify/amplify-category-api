import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
   * Field is defined once in a model
   *
   * @param schema graphql schema
   * @returns true if a field is defined once in a model
   */
export const validateFieldIsDefinedOnce = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    const { fields } = objectTypeDefinition;
    if (!fields) {
      /* istanbul ignore next */
      return;
    }

    const uniquefields: string[] = [];
    for (let i = 0; i < fields?.length; i++) {
      const val = fields[i].name.value;
      if (!uniquefields.includes(val)) {
        uniquefields.push(val);
      } else {
        errors.push(new ValidationError(
          `Schema validation failed. Field ${objectName}.${val} can only be defined once.`,
        ));
      }
    }
  });
  return errors;
};
