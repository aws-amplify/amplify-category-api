import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getObjectWithName } from '../helpers/get-object-with-name';
import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';

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
      const typeName = resolveFieldTypeName(belongsToField.type);
      if (!typeName) {
        /* istanbul ignore next */
        return;
      }
      const objectOfType = getObjectWithName(schema, typeName);
      const relationField = objectOfType?.fields?.find(
        (field) => resolveFieldTypeName(field.type) === objectName,
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
