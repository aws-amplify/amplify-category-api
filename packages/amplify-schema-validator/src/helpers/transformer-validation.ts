import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

export const transformerValidationErrors = (directivesInUse: Set<string>, graphqlTransformerVersion: number): Error[] => {
  const errors: Error[] = [];
  if (directivesInUse.size > 0) {
    const errorMessage = `Your GraphQL Schema is using ${Array.from(directivesInUse.values())
      .map((directive) => `${directive}`)
      .join(', ')} ${directivesInUse.size > 1 ? 'directives' : 'directive'} from ${
      graphqlTransformerVersion === 1 ? 'a newer' : 'an older'
    } version of the GraphQL Transformer. Visit https://docs.amplify.aws/cli/migration/transformer-migration/ to learn how to migrate your GraphQL schema.`;
    errors.push(new InvalidDirectiveError(errorMessage));
  }

  return errors;
};
