import { DocumentNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Validates that every @manyToMany relation has exactly two matching fields
 *
 * @param schema graphql schema
 * @returns true
 */

export const validateManyToManyTwoLocations = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  const allObjectFields = objectTypeDefinitions.reduce((acc, objectTypeDefinition) => {
    if (objectTypeDefinition.fields) {
      return acc.concat(objectTypeDefinition.fields);
    }
    /* istanbul ignore next */
    return acc;
  }, [] as FieldDefinitionNode[]);
  const allManyToManyDirectives = allObjectFields
    .map((objectField) => objectField.directives?.find((directive) => directive.name.value === 'manyToMany'))
    .filter((directive) => directive);

  const relationCounts = {} as { [relationName: string]: number };
  allManyToManyDirectives.forEach((directive) => {
    const relationNameArgument = directive?.arguments?.find((argument) => argument.name.value === 'relationName');
    const relationName = (relationNameArgument?.value as StringValueNode)?.value;
    relationCounts[relationName] = relationCounts[relationName] ? relationCounts[relationName] + 1 : 1;
  });

  const unmatchedRelations = Object.keys(relationCounts).filter((relationName) => relationCounts[relationName] !== 2);
  if (unmatchedRelations.length) {
    errors.push(
      new InvalidDirectiveError(
        `Invalid @manyToMany directive in schema: relation names '${unmatchedRelations.join(', ')}' must be used in exactly two locations.`,
      ),
    );
  }
  return errors;
};
