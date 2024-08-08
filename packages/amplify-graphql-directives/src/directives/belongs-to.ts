import { Directive } from './directive';

const name = 'belongsTo';
// TODO: review overrideIndexName before merging to main
const definition = /* GraphQL */ `
  directive @${name}(fields: [String!], references: [String!], overrideIndexName: String) on FIELD_DEFINITION
`;
const defaults = {};

export const BelongsToDirective: Directive = {
  name,
  definition,
  defaults,
};
