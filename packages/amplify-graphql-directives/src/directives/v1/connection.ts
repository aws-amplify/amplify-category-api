import { Directive } from '../directive';

const name = 'connection';
const definition = /* GraphQL */ `
  directive @${name}(
    name: String
    keyField: String
    sortField: String
    keyName: String
    limit: Int
    fields: [String!]
  ) on FIELD_DEFINITION
`;
const defaults = {};

export const ConnectionDirectiveV1: Directive = {
  name,
  definition,
  defaults,
};
