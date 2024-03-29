import { Directive } from '../directive';

const name = 'aws_lambda';
const definition = /* GraphQL */ `
  directive @${name} on FIELD_DEFINITION | OBJECT
`;
const defaults = {};

export const AwsLambdaDirective: Directive = {
  name,
  definition,
  defaults,
};
