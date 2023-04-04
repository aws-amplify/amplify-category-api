import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Validates that @belongsTo, @connection directives from older graphql transformer version is not used in version 1.0
 *
 * @param schema graphql schema
 * @returns true if correct directives are used
 */

type ValidateSchemaProps = {
  graphqlTransformerVersion: number;
  isDataStoreEnabled: boolean;
};

const GRAPHQL_TRANSFORMER_V2_DIRECTIVES = ['hasOne', 'index', 'primaryKey', 'belongsTo', 'manyToMany', 'hasMany', 'default'];
export const validateDirectivesFromNewerTransformerVersionAreNotUsed = (
  schema: DocumentNode, props: ValidateSchemaProps,
): Error[] => {
  if (props.graphqlTransformerVersion !== 1) {
    return [];
  }

  const errors: Error[] = [];
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
  if (v2DirectivesInUse.size > 0) {
    const errorMessage = `Your GraphQL Schema is using ${Array.from(v2DirectivesInUse.values())
      .map((directive) => `${directive}`)
      .join(', ')} ${
      v2DirectivesInUse.size > 1 ? 'directives' : 'directive'
    } from a newer version of the GraphQL Transformer. Visit https://docs.amplify.aws/cli/migration/transformer-migration/ to learn how to migrate your GraphQL schema.`;
    errors.push(new InvalidDirectiveError(
      errorMessage,
    ));
  }
  return errors;
};
