import { Directive } from './directive';

const name = 'index';
const definition = /* GraphQL */ `
  directive @${name}(name: String, sortKeyFields: [String], queryField: String, projection: ProjectionInput) repeatable on FIELD_DEFINITION
  
  input ProjectionInput {
    type: ProjectionType
    nonKeyAttributes: [String]
  }
  
  enum ProjectionType {
    ALL
    KEYS_ONLY
    INCLUDE
  }
`;
const defaults = {};

export const IndexDirective: Directive = {
  name,
  definition,
  defaults,
};
