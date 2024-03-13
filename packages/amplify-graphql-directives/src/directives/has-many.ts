import { Directive } from './directive';

const name = 'hasMany';
const defaults = {
  limit: 100,
};
const definition = /* GraphQL */ `
  directive @${name}(indexName: String, fields: [String!], references: [String!], limit: Int = ${defaults.limit}) on FIELD_DEFINITION
`;

export const HasManyDirective: Directive = {
  name,
  definition,
  defaults,
};
