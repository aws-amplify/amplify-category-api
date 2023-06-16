import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as os from 'os';
import { AmplifyGraphqlApiSchema } from '../types';

/**
 * Accept a schema in the various ways we support today, and convert into a single stringified representation.
 * @param schema the appsync SchemaFile(s) or string input.
 * @returns the string version of the former.
 */
export const preprocessGraphqlSchema = (schema: AmplifyGraphqlApiSchema): string => {
  if (Array.isArray(schema)) {
    return schema.map((schemaFile) => schemaFile.definition).join(os.EOL);
  }
  return schema instanceof appsync.SchemaFile
    ? schema.definition
    : schema;
};
