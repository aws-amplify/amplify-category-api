import { Directive } from '../directive';

const name = 'function';
const definition = /* GraphQL */ `
  directive @function(name: String!, region: String) repeatable on FIELD_DEFINITION
`;
const defaults = {};

export const FunctionDirectiveV1: Directive = {
  name,
  definition,
  defaults,
};
