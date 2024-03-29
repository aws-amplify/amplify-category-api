import { Directive } from './directive';

export type HttpDirectiveDefaults = { method: string; headers: string[] };
const name = 'http';
const defaults: HttpDirectiveDefaults = {
  method: 'GET',
  headers: [],
};
const definition = /* GraphQL */ `
  directive @${name}(method: HttpMethod = ${defaults.method}, url: String!, headers: [HttpHeader] = ${JSON.stringify(
  defaults.headers,
)}) on FIELD_DEFINITION
  enum HttpMethod {
    GET
    POST
    PUT
    DELETE
    PATCH
  }
  input HttpHeader {
    key: String
    value: String
  }
`;

export const HttpDirective: Directive<HttpDirectiveDefaults> = {
  name,
  definition,
  defaults,
};
