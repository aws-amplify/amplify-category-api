import * as os from 'os';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode } from 'graphql';
import { Schema, Engine, generateGraphQLSchema } from './';
import { constructRDSGlobalAmplifyInput } from './input';

const buildSchemaFromString = (stringSchema: string, engineType: ImportedRDSType): Schema => {
  let schema;
  switch (engineType) {
    case ImportedRDSType.MYSQL:
      schema = new Schema(new Engine('MySQL'));
      break;
    case ImportedRDSType.POSTGRESQL:
      schema = new Schema(new Engine('Postgres'));
      break;
    default:
      throw new Error('Only MySQL and Postgres Data Sources are supported');
  }
  return schema;

  // how to build schema without adapter
};

const renderSchema = (
  schema: Schema,
  transformerVersion: number,
  databaseConfig: any,
  existingSchema: DocumentNode = undefined,
): string => {
  return (
    constructRDSGlobalAmplifyInput(transformerVersion, databaseConfig, existingSchema) +
    os.EOL +
    os.EOL +
    generateGraphQLSchema(schema, existingSchema)
  );
};

export const graphqlSchemaFromRDSSchema = (sqlSchema: string, engineType: ImportedRDSType): string => {
  const schema = buildSchemaFromString(sqlSchema, engineType);

  const transformerVersion = 2;

  // how to construct database config
  const databaseConfig = {};
  return renderSchema(schema, transformerVersion, databaseConfig);
};
