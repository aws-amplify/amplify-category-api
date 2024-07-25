import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
 * Validates that directive manyTomany has a relationName
 *
 * @param schema graphql schema
 * @returns true if manytomany has a relationName
 */

export const validateManyToManyHasRelationName = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'manyToMany'),
    );

    directiveFields?.forEach((directiveField) => {
      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      if (!directiveArgs || directiveArgs.length == 0) {
        errors.push(new ValidationError('@manyToMany relation does not have a relationName'));
      }
      directiveArgs?.forEach((directiveArg) => {
        const fieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'relationName');
        if (!fieldArg) {
          errors.push(new ValidationError('@manyToMany relation does not have a relationName'));
        }
      });
    });
  });
  return errors;
};
