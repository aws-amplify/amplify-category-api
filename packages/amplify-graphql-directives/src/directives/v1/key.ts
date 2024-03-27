import { Directive } from '../directive';

const name = 'key';
const definition = /* GraphQL */ `
  directive @${name}(name: String, fields: [String!]!, queryField: String) repeatable on OBJECT
`;
const defaults = {};

export const KeyDirectiveV1: Directive = {
  name,
  definition,
  defaults,
};
