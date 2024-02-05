import { DataSourceAdapter, MySQLDataSourceAdapter, PostgresDataSourceAdapter } from '../datasource-adapter';
import { DBEngineType, Engine, Schema } from '../schema-representation';
import { generateTypescriptDataSchema } from './generate-ts-schema';

// This is the contract for the customer facing API to provide the database configuration in a typescript file.
export type TypescriptDataSchemaGeneratorConfig = {
  engine: 'mysql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  outputFile?: string;
};

// Generates a typescript data schema from a database configuration.
export class TypescriptDataSchemaGenerator {
  public static generate = async (config: TypescriptDataSchemaGeneratorConfig): Promise<string> => {
    const schema = await TypescriptDataSchemaGenerator.buildSchema(config);
    return generateTypescriptDataSchema(schema);
  };

  private static getAdapter = (config: TypescriptDataSchemaGeneratorConfig): DataSourceAdapter => {
    switch (config.engine) {
      case 'mysql':
        return new MySQLDataSourceAdapter(config);
      case 'postgresql':
        return new PostgresDataSourceAdapter(config);
    }
    throw new Error('Only MySQL and Postgres Data Sources are supported');
  };

  private static getDBEngineType = (config: TypescriptDataSchemaGeneratorConfig): DBEngineType => {
    switch (config.engine) {
      case 'mysql':
        return 'MySQL';
      case 'postgresql':
        return 'Postgres';
    }
    throw new Error('Only MySQL and Postgres Data Sources are supported');
  };

  private static buildSchema = async (config: TypescriptDataSchemaGeneratorConfig): Promise<Schema> => {
    const adapter = TypescriptDataSchemaGenerator.getAdapter(config);
    await adapter.initialize();
    const schema = new Schema(new Engine(TypescriptDataSchemaGenerator.getDBEngineType(config)));
    const models = adapter.getModels();
    adapter.cleanup();
    models.forEach((m) => schema.addModel(m));
    return schema;
  };
}
