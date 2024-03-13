import { Directive } from '../directive';

const name = 'aws_oidc';
const definition = /* GraphQL */ `
  directive @${name} on FIELD_DEFINITION | OBJECT
`;
const defaults = {};

export const AwsOidcDirective: Directive = {
  name,
  definition,
  defaults,
};
