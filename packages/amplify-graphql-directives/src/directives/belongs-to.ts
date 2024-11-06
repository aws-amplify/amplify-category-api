import { Directive } from './directive';

// TODO: GEN1_GEN2_MIGRATION
// decide final naming of overrideIndexName
const name = 'belongsTo';
const definition = /* GraphQL */ `
  directive @${name}(fields: [String!], references: [String!], overrideIndexName: String) on FIELD_DEFINITION
`;
const defaults = {};

export const BelongsToDirective: Directive = {
  name,
  definition,
  defaults,
};
