import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { isListType } from '../helpers/resolve-field-type';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Validates that directive hasOne is not used with a list
 *
 * @param schema graphql schema
 * @returns true if hasOne is not used with lists
 */

export const validateHasOneNotUsedWithLists = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'hasOne'),
    );

    directiveFields?.forEach((directiveField) => {
      const listType = isListType(directiveField.type);
      if (listType) {
        errors.push(
          new InvalidDirectiveError(
            `@hasOne cannot be used with lists in ${directiveField.name.value} field in ${objectName} object. Use @hasMany instead`,
          ),
        );
      }
    });
  });
  return errors;
};
