import { DocumentNode, Kind, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getGraphqlName, toUpper } from '../helpers/util';

/**
 * Validates that relation name does not conflict with an existing type name
 *
 * @param schema graphql schema
 * @returns true if relation name does not conflict with an existing type name
 */

export const validateRelationNameDoesNotConflictWithTypeName = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  const typeNames = objectTypeDefinitions.map((objectTypeDefinition) => objectTypeDefinition.name.value);
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
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

        const val = (fieldArg.value as StringValueNode).value;
        const graphqlName = getGraphqlName(toUpper(val));
        if (typeNames.includes(graphqlName)) {
          errors.push(
            new InvalidDirectiveError(
              `@manyToMany relation name ${graphqlName} (derived from ${val}) already exists as a type in the schema.`,
            ),
          );
        }
      });
    });
  });
  return errors;
};
