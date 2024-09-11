import { Directive } from './directive';

export type FunctionDirectiveDefaults = {
  invocationType: string;
};
const name = 'function';
const defaults: FunctionDirectiveDefaults = {
  invocationType: 'RequestResponse',
};
const definition = /* GraphQL */ `
  directive @${name}(name: String!, region: String, accountId: String, invocationType: InvocationType = ${defaults.invocationType}) repeatable on FIELD_DEFINITION
  enum InvocationType {
    RequestResponse
    Event
  }
`;

export const FunctionDirective: Directive<FunctionDirectiveDefaults> = {
  name,
  definition,
  defaults,
};
