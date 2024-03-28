import { Directive } from './directive';

const name = 'default';
const definition = /* GraphQL */ `
  directive @${name}(value: String!) on FIELD_DEFINITION
`;
const defaults = {};

export const DefaultDirective: Directive = {
  name,
  definition,
  defaults,
};
