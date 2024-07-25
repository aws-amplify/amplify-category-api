import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
 * Validates that two or more relationship fields with the same name does not exist
 *
 * @param schema graphql schema
 * @returns true if relationship fields are unique
 */

export const validateFieldNamesAreUniqueWithRelationsPresent = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.some(
        (directive) => directive.name.value === 'manyToMany' || directive.name.value === 'hasMany' || directive.name.value === 'hasOne',
      ),
    );

    const uniquefields = new Set();
    directiveFields?.forEach((field) => {
      const val = field.name.value;
      if (!uniquefields.has(val.toLowerCase())) {
        uniquefields.add(val.toLowerCase());
      } else {
        errors.push(new ValidationError(`There are two or more relationship fields with the same name`));
      }
    });
  });
  return errors;
};
