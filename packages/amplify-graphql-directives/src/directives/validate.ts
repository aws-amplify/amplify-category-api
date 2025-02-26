import { Directive } from './directive';

const name = 'validate';
const definition = /* GraphQL */ `
  directive @${name}(
    type: ValidationType!
    value: String!
    errorMessage: String
  ) repeatable on FIELD_DEFINITION

  enum ValidationType {
    gt
    lt
    gte
    lte
    minLength
    maxLength
    startsWith
    endsWith
    matches
  }
`;
const defaults = {};

export const ValidateDirective: Directive = {
  name,
  definition,
  defaults,
};
