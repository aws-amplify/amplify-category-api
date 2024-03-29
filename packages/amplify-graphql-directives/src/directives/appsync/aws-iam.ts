import { Directive } from '../directive';

const name = 'aws_iam';
const definition = /* GraphQL */ `
  directive @${name} on FIELD_DEFINITION | OBJECT
`;
const defaults = {};

export const AwsIamDirective: Directive = {
  name,
  definition,
  defaults,
};
