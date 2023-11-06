import * as os from 'os';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode } from 'graphql';
import { Schema, Engine } from './schema-representation';
import { generateGraphQLSchema } from './schema-generator';
import { constructRDSGlobalAmplifyInput } from './input';
import { MySQLStringDataSourceAdapter } from './datasource-adapter';

const buildSchemaFromString = (stringSchema: string, engineType: ImportedRDSType): Schema => {
  let schema;
  let adapter;
  switch (engineType) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLStringDataSourceAdapter(stringSchema);
      schema = new Schema(new Engine('MySQL'));
      break;
    case ImportedRDSType.POSTGRESQL:
      // todo change to postgres
      adapter = new MySQLStringDataSourceAdapter(stringSchema);
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
  const databaseConfig = {
    engine: engineType,
  };
  return renderSchema(schema, transformerVersion, databaseConfig);
};
