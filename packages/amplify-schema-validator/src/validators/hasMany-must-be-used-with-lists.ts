import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { isListType } from '../helpers/resolve-field-type';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

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
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'hasMany'),
    );

    directiveFields?.forEach((directiveField) => {
      const listType = isListType(directiveField.type);
      if (!listType) {
        errors.push(new InvalidDirectiveError('@hasMany must be used with a list. Use @hasOne for non-list types.'));
      }
    });
  });
  return errors;
};
