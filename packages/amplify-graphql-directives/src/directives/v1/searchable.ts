import { Directive } from '../directive';

const name = 'searchable';
const definition = /* GraphQL */ `
  directive @${name}(queries: SearchableQueryMap) on OBJECT
  input SearchableQueryMap {
    search: String
  }
`;
const defaults = {};

export const SearchableDirectiveV1: Directive = {
  name,
  definition,
  defaults,
};
