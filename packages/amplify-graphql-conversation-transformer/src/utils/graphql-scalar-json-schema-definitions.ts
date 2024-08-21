import { JSONSchema } from './graphql-json-schema-type';

const Boolean: JSONSchema = {
  type: 'boolean',
  description: 'A boolean value.',
};

const Int: JSONSchema = {
  type: 'number',
  description: 'A signed 32-bit integer value.',
};

const Float: JSONSchema = {
  type: 'number',
  description: 'An IEEE 754 floating point value.',
};

const String: JSONSchema = {
  type: 'string',
  description: 'A UTF-8 character sequence.',
};

const AWSDateTime: JSONSchema = {
  type: 'string',
  description: 'An extended ISO 8601 date and time string in the format YYYY-MM-DDThh:mm:ss.sssZ.',
};

const ID: JSONSchema = {
  type: 'string',
  description: "A unique identifier for an object. This scalar is serialized like a String but isn't meant to be human-readable.",
};

const AWSJSON: JSONSchema = {
  type: 'string',
  description:
    'A JSON string. Any valid JSON construct is automatically parsed and loaded in the resolver code as maps, lists, or scalar values rather than as the literal input strings. Unquoted strings or otherwise invalid JSON result in a GraphQL validation error.',
};

const AWSEmail: JSONSchema = {
  type: 'string',
  description: 'An email address in the format local-part@domain-part as defined by RFC 822.',
};

const AWSDate: JSONSchema = {
  type: 'string',
  description: 'An extended ISO 8601 date string in the format YYYY-MM-DD.',
};

const AWSTime: JSONSchema = {
  type: 'string',
  description: 'An extended ISO 8601 time string in the format hh:mm:ss.sss.',
};

const AWSTimestamp: JSONSchema = {
  type: 'string',
  description: 'An integer value representing the number of seconds before or after 1970-01-01-T00:00Z.',
};

const AWSPhone: JSONSchema = {
  type: 'string',
  description:
    'A phone number. This value is stored as a string. Phone numbers can contain either spaces or hyphens to separate digit groups. Phone numbers without a country code are assumed to be US/North American numbers adhering to the North American Numbering Plan (NANP).',
};

const AWSURL: JSONSchema = {
  type: 'string',
  description:
    "A URL as defined by RFC 1738. For example, https://www.amazon.com/dp/B000NZW3KC/ or mailto:example@example.com. URLs must contain a schema (http, mailto) and can't contain two forward slashes (//) in the path part.",
};

const AWSIPAddress: JSONSchema = {
  type: 'string',
  description:
    'A valid IPv4 or IPv6 address. IPv4 addresses are expected in quad-dotted notation (123.12.34.56). IPv6 addresses are expected in non-bracketed, colon-separated format (1a2b:3c4b::1234:4567). You can include an optional CIDR suffix (123.45.67.89/16) to indicate subnet mask.',
};

const disallowedScalarTypes = ['AWSEmail', 'AWSDate', 'AWSTime', 'AWSDateTime', 'AWSTimestamp', 'AWSPhone', 'AWSURL', 'AWSIPAddress'];

export const supportedScalarTypes = ['Boolean', 'Int', 'Float', 'String', 'ID', 'AWSJSON'];

export const isDisallowedScalarType = (type: string): boolean => {
  return disallowedScalarTypes.includes(type);
};

export const GraphQLScalarJSONSchemaDefinition = {
  Boolean,
  Int,
  Float,
  String,
  AWSDateTime,
  ID,
  AWSJSON,
  AWSEmail,
  AWSDate,
  AWSTime,
  AWSTimestamp,
  AWSPhone,
  AWSURL,
  AWSIPAddress,
};
