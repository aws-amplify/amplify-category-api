import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
 * Validates that @key, @connection directives from older graphql transformer version is not used in version 2.0
 *
 * @param schema graphql schema
 * @returns true if correct directives are used
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
export const validateDirectivesFromOlderTransformerVersionAreNotUsed = (
  schema: DocumentNode, amplifyFeatureFlags?: string, _dataStoreEnabled?: boolean,
): Error[] => {
  if (!amplifyFeatureFlags) {
    return [];
  }
  const featureFlags = JSON.parse(amplifyFeatureFlags);
  const transformerVersion = featureFlags.features.graphqltransformer.transformerversion;
  console.log('transformerVersion -- ', transformerVersion);
  if (transformerVersion !== 2) {
    return [];
  }
  const errors: Error[] = [];
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
  if (v1DirectivesInUse.size > 0) {
    const errorMessage = `Your GraphQL Schema is using ${Array.from(v1DirectivesInUse.values())
      .map((directive) => `${directive}`)
      .join(', ')} ${
      v1DirectivesInUse.size > 1 ? 'directives' : 'directive'
    } from an older version of the GraphQL Transformer. Visit https://docs.amplify.aws/cli/migration/transformer-migration/ to learn how to migrate your GraphQL schema.`;
    errors.push(new InvalidDirectiveError(
      errorMessage,
    ));
  }
  return errors;
};
