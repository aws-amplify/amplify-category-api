import { Directive } from '../directive';

const name = 'aws_cognito_user_pools';
const definition = /* GraphQL */ `
  directive @${name}(cognito_groups: [String!]) on FIELD_DEFINITION | OBJECT
`;
const defaults = {};

export const AwsCognitoUserPoolsDirective: Directive = {
  name,
  definition,
  defaults,
};
