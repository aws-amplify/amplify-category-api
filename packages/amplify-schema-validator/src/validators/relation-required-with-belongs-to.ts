import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  NamedTypeNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getObjectWithName } from '../helpers/get-object-with-name';

/**
 * The @belongsTo directive requires that a @hasOne or @hasMany relationship already exists from parent to the related model.
 *
 * @param schema graphql schema
 * @returns true
 */
export const validateRequireBelongsToRelation = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    const belongsToFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'belongsTo',
    ));
    belongsToFields?.forEach((belongsToField) => {
      const typeName = (belongsToField.type as NamedTypeNode)?.name.value;
      const objectOfType = getObjectWithName(schema, typeName);
      const relationField = objectOfType?.fields?.find(
        (field) => (field.type as NamedTypeNode)?.name?.value === objectName,
      );
      const relationDirective = relationField?.directives?.find((directive) => ['hasOne', 'hasMany'].includes(directive.name.value));
      if (!relationDirective) {
        errors.push(new InvalidDirectiveError(
          'Invalid @belongs directive in schema: @belongsTo directive requires that a @hasOne or @hasMany relationship already exists from parent to the related model.',
        ));
      }
    });
  });
  return errors;
};
