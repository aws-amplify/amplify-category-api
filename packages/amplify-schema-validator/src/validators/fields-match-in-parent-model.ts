import { DocumentNode, Kind, ListValueNode, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Validates that fields match in the parent model
 *
 * @param schema graphql schema
 * @returns true if fields match in parent model
 */

export const validateFieldsMatchInParentModel = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find(
        (directive) =>
          directive.name.value === 'connection' ||
          directive.name.value === 'hasOne' ||
          directive.name.value === 'belongsTo' ||
          directive.name.value === 'hasMany',
      ),
    );

    directiveFields?.forEach((directiveField) => {
      const fields = objectTypeDefinition?.fields;
      if (!fields) {
        /* istanbul ignore next */
        return;
      }

      const fieldVals = fields.map((field) => field.name.value);

      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      directiveArgs?.forEach((directiveArg) => {
        const fieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'fields');
        if (!fieldArg) {
          /* istanbul ignore next */
          return;
        }

        const fieldArgVals = (fieldArg.value as ListValueNode).values;
        fieldArgVals.forEach((fieldArgVal) => {
          const val = (fieldArgVal as StringValueNode).value;
          if (!fieldVals.includes(val)) {
            errors.push(new InvalidDirectiveError(`${val} is not a field in ${objectTypeDefinition.name.value}`));
          }
        });
      });
    });
  });
  return errors;
};
