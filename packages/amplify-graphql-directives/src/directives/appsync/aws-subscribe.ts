import { Directive } from '../directive';

const name = 'aws_subscribe';
const definition = /* GraphQL */ `
  directive @${name}(mutations: [String!]!) on FIELD_DEFINITION
`;
const defaults = {};

export const AwsSubscribeDirective: Directive = {
  name,
  definition,
  defaults,
};
