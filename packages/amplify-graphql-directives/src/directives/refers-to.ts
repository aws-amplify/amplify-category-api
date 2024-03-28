import { Directive } from './directive';

const name = 'refersTo';
const definition = /* GraphQL */ `
  directive @${name}(name: String!) on OBJECT | FIELD_DEFINITION
`;
const defaults = {};

export const RefersToDirective: Directive = {
  name,
  definition,
  defaults,
};
