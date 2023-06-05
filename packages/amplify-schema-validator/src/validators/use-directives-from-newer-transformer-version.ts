import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { ValidateSchemaProps } from '../helpers/schema-validator-props';
import { transformerValidationErrors } from '../helpers/transformer-validation';

/**
 * Validates that @belongsTo, @connection directives from older graphql transformer version is not used in version 1.0
 *
 * @param schema graphql schema
 * @returns true if correct directives are used
 */

const GRAPHQL_TRANSFORMER_V2_DIRECTIVES = ['hasOne', 'index', 'primaryKey', 'belongsTo', 'manyToMany', 'hasMany', 'default'];
/**
 *
 * @param schema
 * @param props
 */
export const validateDirectivesFromNewerTransformerVersionAreNotUsed = (
  schema: DocumentNode, props: ValidateSchemaProps,
): Error[] => {
  if (props.graphqlTransformerVersion !== 1) {
    return [];
  }

  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  const v2DirectivesInUse = new Set<string>();

  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => GRAPHQL_TRANSFORMER_V2_DIRECTIVES.includes(directive.name.value),
    ));

    directiveFields?.forEach((directiveField) => {
      const { directives } = directiveField;

      directives?.forEach((directive) => {
        const directiveName = directive.name.value;
        if (GRAPHQL_TRANSFORMER_V2_DIRECTIVES.includes(directiveName)) {
          v2DirectivesInUse.add(`@${directiveName}`);
        }
      });
    });
  });

  return transformerValidationErrors(v2DirectivesInUse, props.graphqlTransformerVersion);
};
