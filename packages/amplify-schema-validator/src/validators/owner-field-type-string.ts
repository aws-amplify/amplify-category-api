import { DocumentNode, Kind, ListValueNode, ObjectTypeDefinitionNode, ObjectValueNode } from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
 * Types annotated with @auth must also be annotated with @model.
 *
 * @param schema graphql schema
 * @returns true if types annotated with @auth are also be annotated with @model.
 */

export const validateOwnerFieldTypeString = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directives = objectTypeDefinition.directives;
    directives?.forEach((directive) => {
      if (directive.name.value === 'auth') {
        const directiveArgs = directive.arguments;
        directiveArgs?.forEach((directiveArg) => {
          if (directiveArg.name.value === 'rules') {
            const authArgs = (directiveArg.value as ListValueNode).values.find((elem) => elem.kind);
            const authFields = (authArgs as ObjectValueNode).fields;
            authFields.forEach((authField) => {
              if (authField.name.value === 'ownerField' && authField.value.kind !== 'StringValue') {
                errors.push(new ValidationError('String cannot represent a non string value'));
                return errors;
              }
            });
          }
        });
      }
    });
  });
  return errors;
};
