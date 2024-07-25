import { DocumentNode, EnumTypeDefinitionNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getTypeDefinitionsOfKind } from '../helpers/get-type-definitions-of-kind';
import { isScalarOrEnum } from '../helpers/is-scalar-or-enum';

/**
 * Validates that every @index directive is of a scalar type
 *
 * @param schema graphql schema
 * @returns true
 */

export const validateIndexScalarTypes = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  const allObjectFields = objectTypeDefinitions.reduce(
    (acc, objectTypeDefinition) => acc.concat(objectTypeDefinition.fields as FieldDefinitionNode[]),
    [] as FieldDefinitionNode[],
  );

  const fieldsWithIndexDirectives = allObjectFields.filter((objectField) =>
    objectField.directives?.find((directive) => directive.name.value === 'index'),
  );

  const enums = getTypeDefinitionsOfKind(schema, Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
  const fieldsWithNonScalarIndex = fieldsWithIndexDirectives.filter((field) => !isScalarOrEnum(field.type, enums));
  const fieldNamesWithNonScalarIndex = fieldsWithNonScalarIndex.map((field) => field.name.value);
  if (fieldsWithNonScalarIndex.length) {
    errors.push(new InvalidDirectiveError(`@index directive on '${fieldNamesWithNonScalarIndex.join(', ')}' cannot be a non-scalar`));
  }
  return errors;
};
