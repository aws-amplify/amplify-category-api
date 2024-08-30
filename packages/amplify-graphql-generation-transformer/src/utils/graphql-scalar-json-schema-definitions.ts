import { JSONSchema } from './graphql-json-schema-type';

/** JSON Schema definition for GraphQL Boolean type */
const Boolean: JSONSchema = {
  type: 'boolean',
  description: 'A boolean value.',
};

/** JSON Schema definition for GraphQL Int type */
const Int: JSONSchema = {
  type: 'number',
  description: 'A signed 32-bit integer value.',
};

/** JSON Schema definition for GraphQL Float type */
const Float: JSONSchema = {
  type: 'number',
  description: 'An IEEE 754 floating point value.',
};

/** JSON Schema definition for GraphQL String type */
const String: JSONSchema = {
  type: 'string',
  description: 'A UTF-8 character sequence.',
};

/** JSON Schema definition for GraphQL ID type */
const ID: JSONSchema = {
  type: 'string',
  description: "A unique identifier for an object. This scalar is serialized like a String but isn't meant to be human-readable.",
};

/** JSON Schema definition for AWS AppSync AWSJSON type */
const AWSJSON: JSONSchema = {
  type: 'string',
  description:
    'A JSON string. Any valid JSON construct is automatically parsed and loaded in the resolver code as maps, lists, or scalar values rather than as the literal input strings. Unquoted strings or otherwise invalid JSON result in a GraphQL validation error.',
};

/** JSON Schema definition for AWS AppSync AWSEmail type */
const AWSEmail: JSONSchema = {
  type: 'string',
  description: 'An email address in the format local-part@domain-part as defined by RFC 822.',
  pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
};

/** JSON Schema definition for AWS AppSync AWSDate type */
const AWSDate: JSONSchema = {
  type: 'string',
  description: 'An extended ISO 8601 date string in the format YYYY-MM-DD.',
  pattern: '^\\d{4}-d{2}-d{2}$',
};

/** JSON Schema definition for AWS AppSync AWSTime type */
const AWSTime: JSONSchema = {
  type: 'string',
  description: 'An extended ISO 8601 time string in the format hh:mm:ss.sss.',
  pattern: '^\\d{2}:\\d{2}:\\d{2}\\.\\d{3}$',
};

/** JSON Schema definition for AWS AppSync AWSDateTime type */
const AWSDateTime: JSONSchema = {
  type: 'string',
  description: 'An extended ISO 8601 date and time string in the format YYYY-MM-DDThh:mm:ss.sssZ.',
  pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
};

/** JSON Schema definition for AWS AppSync AWSTimestamp type */
const AWSTimestamp: JSONSchema = {
  type: 'string',
  description: 'An integer value representing the number of seconds before or after 1970-01-01-T00:00Z.',
  pattern: '^\\d+$',
};

/** JSON Schema definition for AWS AppSync AWSPhone type */
const AWSPhone: JSONSchema = {
  type: 'string',
  description:
    'A phone number. This value is stored as a string. Phone numbers can contain either spaces or hyphens to separate digit groups. Phone numbers without a country code are assumed to be US/North American numbers adhering to the North American Numbering Plan (NANP).',
  pattern: '^\\d{3}-d{3}-d{4}$',
};

/** JSON Schema definition for AWS AppSync AWSURL type */
const AWSURL: JSONSchema = {
  type: 'string',
  description:
    "A URL as defined by RFC 1738. For example, https://www.amazon.com/dp/B000NZW3KC/ or mailto:example@example.com. URLs must contain a schema (http, mailto) and can't contain two forward slashes (//) in the path part.",
  pattern: '^(https?|mailto)://[^s/$.?#].[^s]*$',
};

/** JSON Schema definition for AWS AppSync AWSIPAddress type */
const AWSIPAddress: JSONSchema = {
  type: 'string',
  description:
    'A valid IPv4 or IPv6 address. IPv4 addresses are expected in quad-dotted notation (123.12.34.56). IPv6 addresses are expected in non-bracketed, colon-separated format (1a2b:3c4b::1234:4567). You can include an optional CIDR suffix (123.45.67.89/16) to indicate subnet mask.',
  pattern:
    '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:/d{1,2})?$|^(?:(?:[0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(?:/d{1,3})?$',
};

/**
 * List of scalar types that are not allowed for required fields.
 *
 * @remarks
 * LLMs are not great at following regex pattern requirements, they'll sometimes return "\<UNKNOWN\>" for required fields.
 * This leads to AppSync type validation failures. This is particularly problematic for required `@model` fields like `createdAt` and `updatedAt`.
 *
 * @todo
 * Explore ways to lift this constraint. Current thoughts:
 *  - Improve prompt engineering for better handling of these types
 *  - Refine regex patterns in JSON Schema tool definitions
 *  - Implement special case handling for models (e.g., omitting createdAt, updatedAt, and id in tool definition,
 *   and populating them in the resolver)
 */
const disallowedScalarTypes = ['AWSEmail', 'AWSDate', 'AWSTime', 'AWSDateTime', 'AWSTimestamp', 'AWSPhone', 'AWSURL', 'AWSIPAddress'];

/** List of supported scalar types */
export const supportedScalarTypes = ['Boolean', 'Int', 'Float', 'String', 'ID', 'AWSJSON'];

/**
 * Checks if a given type is a disallowed scalar type
 * @param type - The type to check
 * @returns True if the type is disallowed, false otherwise
 */
export const isDisallowedScalarType = (type: string): boolean => {
  return disallowedScalarTypes.includes(type);
};

/** Object containing JSON Schema definitions for GraphQL scalar types */
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
