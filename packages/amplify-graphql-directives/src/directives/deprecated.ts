import { Directive } from './directive';

const name = 'deprecated';
const definition = /* GraphQL */ `
  directive @${name}(reason: String) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | ENUM | ENUM_VALUE
`;
const defaults = {};

export const DeprecatedDirective: Directive = {
  name,
  definition,
  defaults,
};
