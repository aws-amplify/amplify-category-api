import { Directive } from './directive';

export type ManyToManyDirectiveDefaults = { limit: number };
const name = 'manyToMany';
const defaults: ManyToManyDirectiveDefaults = {
  limit: 100,
};
const definition = /* GraphQL */ `
  directive @${name}(relationName: String!, limit: Int = ${defaults.limit}) on FIELD_DEFINITION
`;

export const ManyToManyDirective: Directive<ManyToManyDirectiveDefaults> = {
  name,
  definition,
  defaults,
};
