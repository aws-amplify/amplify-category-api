import { Directive } from './directive';

const name = 'manyToMany';
const defaults = {
  limit: 100,
};
const definition = /* GraphQL */ `
  directive @${name}(relationName: String!, limit: Int = ${defaults.limit}) on FIELD_DEFINITION
`;

export const ManyToManyDirective: Directive = {
  name,
  definition,
  defaults,
};
