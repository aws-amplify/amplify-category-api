import { Directive } from './directive';

const name = 'index';
const definition = /* GraphQL */ `
  directive @${name}(name: String, sortKeyFields: [String], queryField: String) repeatable on FIELD_DEFINITION
`;
const defaults = {};

export const IndexDirective: Directive = {
  name,
  definition,
  defaults,
};
