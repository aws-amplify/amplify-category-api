import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { isListType } from '../helpers/resolve-field-type';

/**
 * Validates that directive hasMany is used with lists
 *
 * @param schema graphql schema
 * @returns true if hasMany is used with lists
 */

export const validateHasManyIsUsedWithLists = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'hasMany'),
    );

    directiveFields?.forEach((directiveField) => {
      const listType = isListType(directiveField.type);
      if (!listType) {
        errors.push(
          new InvalidDirectiveError(
            `${directiveField.name.value} field in ${objectName} object has a @hasMany directive which must be used with a list. Use @hasOne for non-list types.`,
          ),
        );
      }
    });
  });
  return errors;
};
