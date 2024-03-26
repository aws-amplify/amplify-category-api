import { Directive } from '../directive';

const name = 'aws_api_key';
const definition = /* GraphQL */ `
  directive @${name} on FIELD_DEFINITION | OBJECT
`;
const defaults = {};

export const AwsApiKeyDirective: Directive = {
  name,
  definition,
  defaults,
};
