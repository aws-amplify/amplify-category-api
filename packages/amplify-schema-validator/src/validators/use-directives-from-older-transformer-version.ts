import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { ValidateSchemaProps } from '../helpers/schema-validator-props';
import { transformerValidationErrors } from '../helpers/transformer-validation';

/**
 * Validates that @key, @connection directives from older graphql transformer version is not used in version 2.0
 *
 * @param schema graphql schema
 * @returns true if correct directives are used
 */

/**
 *
 * @param schema
 * @param props
 */
export const validateDirectivesFromOlderTransformerVersionAreNotUsed = (
  schema: DocumentNode, props: ValidateSchemaProps,
): Error[] => {
  if (props.graphqlTransformerVersion !== 2) {
    return [];
  }

  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  const v1DirectivesInUse = new Set<string>();

  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectDirectives = objectTypeDefinition.directives?.map((directive) => directive.name.value);
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'connection',
    ));
    if (objectDirectives?.includes('key')) {
      v1DirectivesInUse.add('@key');
    }
    if (objectDirectives?.includes('versioned')) {
      v1DirectivesInUse.add('@versioned');
    }
    if (directiveFields && directiveFields.length > 0) {
      v1DirectivesInUse.add('@connection');
    }
  });
  return transformerValidationErrors(v1DirectivesInUse, props.graphqlTransformerVersion);
};
