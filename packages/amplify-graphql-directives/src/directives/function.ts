import { Directive } from './directive';

const name = 'function';
const definition = /* GraphQL */ `
  directive @${name}(name: String!, region: String, accountId: String) repeatable on FIELD_DEFINITION
`;
const defaults = {};

export const FunctionDirective: Directive = {
  name,
  definition,
  defaults,
};
