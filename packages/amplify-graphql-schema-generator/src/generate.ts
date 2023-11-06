import * as os from 'os';
import { ImportedSQLType } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode } from 'graphql';
import { Schema, Engine } from './schema-representation';
import { generateGraphQLSchema } from './schema-generator';
import { constructRDSGlobalAmplifyInput } from './input';
import { MySQLStringDataSourceAdapter, PostgresStringDataSourceAdapter } from './datasource-adapter';

const buildSchemaFromString = (stringSchema: string, engineType: ImportedSQLType): Schema => {
  let schema;
  let adapter;
  switch (engineType) {
    case ImportedSQLType.MYSQL:
      adapter = new MySQLStringDataSourceAdapter(stringSchema);
      schema = new Schema(new Engine('MySQL'));
      break;
    case ImportedSQLType.POSTGRESQL:
      adapter = new PostgresStringDataSourceAdapter(stringSchema);
      schema = new Schema(new Engine('Postgres'));
      break;
    default:
      throw new Error('Only MySQL and Postgres Data Sources are supported');
  }

  const models = adapter.getModels();
  models.forEach((m) => schema.addModel(m));
  return schema;
};

export const renderSchema = (
  schema: Schema,
  databaseConfig: any,
  includeAuthRule: boolean = false,
  existingSchema: DocumentNode = undefined,
): string => {
  return constructRDSGlobalAmplifyInput(databaseConfig, existingSchema) + os.EOL + os.EOL + generateGraphQLSchema(schema, existingSchema);
};

export const graphqlSchemaFromRDSSchema = (sqlSchema: string, engineType: ImportedSQLType): string => {
  const schema = buildSchemaFromString(sqlSchema, engineType);

  const databaseConfig = {
    engine: engineType,
  };
  const includeAuthRule = false;
  return renderSchema(schema, databaseConfig, includeAuthRule);
};
