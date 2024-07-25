import { DocumentNode, Kind, ListValueNode, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Validates that sort key fields exists in model
 *
 * @param schema graphql schema
 * @returns true if sort key fields exists in model
 */

export const verifyIndexSortKeyFieldsExistInModel = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'index'),
    );

    directiveFields?.forEach((directiveField) => {
      const fieldVals = objectTypeDefinition.fields?.map((field) => field.name.value);

      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      directiveArgs?.forEach((directiveArg) => {
        const sortKeyFieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'sortKeyFields');
        if (!sortKeyFieldArg) {
          /* istanbul ignore next */
          return;
        }
        const sortKeyFieldArgVals = (sortKeyFieldArg.value as ListValueNode).values;
        sortKeyFieldArgVals.forEach((fieldArgVal) => {
          const val = (fieldArgVal as StringValueNode).value;
          if (!fieldVals?.includes(val)) {
            const nameFieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'name');
            const nameVal = (nameFieldArg?.value as StringValueNode).value;
            errors.push(
              new InvalidDirectiveError(
                `Can't find field '${val}' in ${objectTypeDefinition.name.value}, but it was specified in index '${nameVal}'`,
              ),
            );
          }
        });
      });
    });
  });
  return errors;
};
