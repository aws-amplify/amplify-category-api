import { Directive } from './directive';

const name = 'hasOne';
const definition = /* GraphQL */ `
  directive @${name}(indexName: String, fields: [String!], references: [String!]) on FIELD_DEFINITION
`;
const defaults = {};

export const HasOneDirective: Directive = {
  name,
  definition,
  defaults,
};
