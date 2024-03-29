import { Directive } from '../directive';

const name = 'aws_auth';
const definition = /* GraphQL */ `
  directive @${name}(cognito_groups: [String!]!) on FIELD_DEFINITION
`;
const defaults = {};

export const AwsAuthDirective: Directive = {
  name,
  definition,
  defaults,
};
