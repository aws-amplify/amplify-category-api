import * as os from 'os';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { AmplifyApiGraphqlSchema, AmplifyApiSchemaPreprocessor, AmplifyApiSchemaPreprocessorOutput } from '../types';

export const preprocessSchema = <SchemaType>(
  schema: SchemaType,
  preprocessor?: AmplifyApiSchemaPreprocessor<SchemaType>,
): AmplifyApiSchemaPreprocessorOutput => (preprocessor ? preprocessor(schema) : preprocessGraphqlSchema(schema as AmplifyApiGraphqlSchema));

/**
 * Accept a schema in the various ways we support today, and convert into a single stringified representation.
 * @param schema the appsync SchemaFile(s) or string input.
 * @returns the string version of the former.
 */
const preprocessGraphqlSchema: AmplifyApiSchemaPreprocessor<AmplifyApiGraphqlSchema> = (
  schema: AmplifyApiGraphqlSchema,
): AmplifyApiSchemaPreprocessorOutput => {
  if (Array.isArray(schema)) {
    return {
      processedSchema: schema.map((schemaFile) => schemaFile.definition).join(os.EOL),
    };
  }
  return {
    processedSchema: schema instanceof appsync.SchemaFile ? schema.definition : schema,
  };
};
