import { Directive } from './directive';

const name = 'primaryKey';
const definition = /* GraphQL */ `
  directive @${name}(sortKeyFields: [String]) on FIELD_DEFINITION
`;
const defaults = {};

export const PrimaryKeyDirective: Directive = {
  name,
  definition,
  defaults,
};
