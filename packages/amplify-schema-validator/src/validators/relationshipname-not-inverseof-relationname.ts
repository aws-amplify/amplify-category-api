import { DocumentNode, Kind, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
 * Validates that relationship names are not inverse of relation names
 *
 * @param schema graphql schema
 * @returns true if relationship names are not inverse of relation names
 */

export const validateRelationshipNamesAreNotInverseOfRelationName = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'manyToMany'),
    );
    directiveFields?.forEach((directiveField) => {
      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      directiveArgs?.forEach((directiveArg) => {
        const fieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'relationName');
        if (!fieldArg) {
          /* istanbul ignore next */
          return;
        }

        const relationName = (fieldArg?.value as StringValueNode)?.value;
        const resolver1 = relationName.concat(objectName);
        const resolver2 = objectName.concat(directiveField.name.value);

        if (resolver1 === resolver2) {
          errors.push(
            new ValidationError(
              `Relationship name ${directiveField.name.value} conflicts with relationName ${relationName}. Please change your relationship name`,
            ),
          );
        }
      });
    });
  });
  return errors;
};
