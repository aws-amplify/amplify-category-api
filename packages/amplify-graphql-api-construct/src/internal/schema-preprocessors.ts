import * as appsync from 'aws-cdk-lib/aws-appsync';

export const preprocessGraphQLSchema = (
  schema: appsync.SchemaFile | string,
): string => (schema instanceof appsync.SchemaFile ? schema.definition : schema);
