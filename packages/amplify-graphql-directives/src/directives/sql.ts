import { Directive } from './directive';

const name = 'sql';
const definition = /* GraphQL */ `
  directive @${name}(statement: String, reference: String) on FIELD_DEFINITION
`;
const defaults = {};

export const SqlDirective: Directive = {
  name,
  definition,
  defaults,
};
