import { Directive } from './directive';

const name = 'resolver';
const definition = /* GraphQL */ `
  directive @${name}(
    functions: [ResolverFunction!]!
  ) on FIELD_DEFINITION

  input ResolverFunction {
    dataSource: String!
    entry: String!
  }
`;

const defaults = {};

export const ResolverDirective: Directive = {
  name,
  definition,
  defaults,
};
