import { Directive } from './directive';

const name = 'sequence';
const definition = /* GraphQL */ `
  directive @${name} on FIELD_DEFINITION
`;
const defaults = {};

export const SequenceDirective: Directive = {
  name,
  definition,
  defaults,
};
