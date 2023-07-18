import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Types annotated with @auth must also be annotated with @model.
 *
 * @param schema graphql schema
 * @returns true if types annotated with @auth are also be annotated with @model.
 */

export const validateAuthIsAnnotatedWithModel = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directives = objectTypeDefinition.directives?.map((directive) => directive.name.value);
    if (directives && directives.includes('auth') && !directives.includes('model')) {
      errors.push(new InvalidDirectiveError('Types annotated with @auth must also be annotated with @model.'));
    }
  });
  return errors;
};
