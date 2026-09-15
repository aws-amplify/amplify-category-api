import { Directive } from './directive';

const name = 'mapsTo';
const definition = /* GraphQL */ `
  directive @${name}(name: String!) on OBJECT
`;
const defaults = {};

export const MapsToDirective: Directive = {
  name,
  definition,
  defaults,
};
