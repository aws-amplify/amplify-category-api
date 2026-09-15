import { Directive } from './directive';

const name = 'searchable';
const definition = /* GraphQL */ `
  directive @${name}(queries: SearchableQueryMap) on OBJECT
  input SearchableQueryMap {
    search: String
  }
`;
const defaults = {};

export const SearchableDirective: Directive = {
  name,
  definition,
  defaults,
};
