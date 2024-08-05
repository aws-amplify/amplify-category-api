import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode } from 'graphql';
import * as os from 'os';
import { MySQLStringDataSourceAdapter, PostgresStringDataSourceAdapter } from './datasource-adapter';
import { constructRDSGlobalAmplifyInput } from './input';
import { generateGraphQLSchema } from './schema-generator';
import { Engine, Schema } from './schema-representation';

const buildSchemaFromString = (stringSchema: string, engineType: ImportedRDSType): Schema => {
  let schema;
  let adapter;
  switch (engineType) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLStringDataSourceAdapter(stringSchema);
      schema = new Schema(new Engine('MySQL'));
      break;
    case ImportedRDSType.POSTGRESQL:
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

export const graphqlSchemaFromSQLSchema = (sqlSchema: string, engineType: ImportedRDSType): string => {
  const schema = buildSchemaFromString(sqlSchema, engineType);

  const databaseConfig = {
    engine: engineType,
  };
  const includeAuthRule = false;
  return renderSchema(schema, databaseConfig, includeAuthRule);
};
