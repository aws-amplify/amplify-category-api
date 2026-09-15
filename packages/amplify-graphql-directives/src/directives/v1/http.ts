import { Directive } from '../directive';

export type HttpDirectiveV1Defaults = { method: string; headers: string[] };
const name = 'http';
const defaults: HttpDirectiveV1Defaults = {
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

export const HttpDirectiveV1: Directive<HttpDirectiveV1Defaults> = {
  name,
  definition,
  defaults,
};
