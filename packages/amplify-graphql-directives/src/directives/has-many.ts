import { Directive } from './directive';

export type HasManyDirectiveDefaults = { limit: number };
const name = 'hasMany';
const defaults: HasManyDirectiveDefaults = {
  limit: 100,
};
const definition = /* GraphQL */ `
  directive @${name}(indexName: String, fields: [String!], references: [String!], limit: Int = ${defaults.limit}) on FIELD_DEFINITION
`;

export const HasManyDirective: Directive<HasManyDirectiveDefaults> = {
  name,
  definition,
  defaults,
};
