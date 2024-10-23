import { Directive } from './directive';

const name = 'belongsTo';
const definition = /* GraphQL */ `
  directive @${name}(fields: [String!], references: [String!]) on FIELD_DEFINITION
`;
const defaults = {};

export const BelongsToDirective: Directive = {
  name,
  definition,
  defaults,
};
