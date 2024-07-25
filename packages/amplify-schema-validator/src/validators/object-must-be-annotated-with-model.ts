import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getObjectWithName } from '../helpers/get-object-with-name';
import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';

/**
 * Validates @belongsTo/@hasOne/@hasMany/@connection was used with a related type that is a model
 *
 * @param schema graphql schema
 * @returns true if @belongsTo/@hasOne/@hasMany/@connection was used with a related type that is a model
 */

export const validateObjectIsAnnotatedWithModel = (schema: DocumentNode): Error[] => {
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
      const typeName = resolveFieldTypeName(directiveField.type);
      const objectOfType = getObjectWithName(schema, typeName);
      const directives = objectOfType?.directives?.map((directive) => directive.name.value);
      if (!directives || !directives.includes('model')) {
        errors.push(new InvalidDirectiveError(`Object type ${objectOfType?.name.value} must be annotated with @model`));
      }
    });
  });
  return errors;
};
