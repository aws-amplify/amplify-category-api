import * as os from 'os';
import { DocumentNode } from 'graphql';
import { ModelDataSourceSqlDbType, MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from 'graphql-transformer-common';
import { Schema, Engine } from './schema-representation';
import { generateGraphQLSchema } from './schema-generator';
import { constructRDSGlobalAmplifyInput } from './input';
import { MySQLStringDataSourceAdapter, PostgresStringDataSourceAdapter } from './datasource-adapter';

const buildSchemaFromString = (stringSchema: string, dbType: ModelDataSourceSqlDbType): Schema => {
  let schema;
  let adapter;
  switch (dbType) {
    case MYSQL_DB_TYPE:
      adapter = new MySQLStringDataSourceAdapter(stringSchema);
      schema = new Schema(new Engine('MySQL'));
      break;
    case POSTGRES_DB_TYPE:
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
  includeAuthRule = false,
  existingSchema: DocumentNode = undefined,
): string => {
  return constructRDSGlobalAmplifyInput(databaseConfig, existingSchema) + os.EOL + os.EOL + generateGraphQLSchema(schema, existingSchema);
};

export const graphqlSchemaFromRDSSchema = (sqlSchema: string, engineType: ModelDataSourceSqlDbType): string => {
  const schema = buildSchemaFromString(sqlSchema, engineType);

  const databaseConfig = {
    engine: engineType,
  };
  const includeAuthRule = false;
  return renderSchema(schema, databaseConfig, includeAuthRule);
};
