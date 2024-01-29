import { DataSourceAdapter, MySQLDataSourceAdapter, PostgresDataSourceAdapter } from '../datasource-adapter';
import { DBEngineType, Engine, Schema } from '../schema-representation';
import { generateTypescriptDataSchema } from './generate-ts-schema';

export type TypescriptDataSchemaGeneratorConfig = {
  engine: DBEngineType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

export class TypescriptDataSchemaGenerator {
  public static generate = async (config: TypescriptDataSchemaGeneratorConfig): Promise<string> => {
    const schema = await TypescriptDataSchemaGenerator.buildSchema(config);
    return generateTypescriptDataSchema(schema);
  };

  private static getAdapter = (config: TypescriptDataSchemaGeneratorConfig): DataSourceAdapter => {
    switch (config.engine) {
      case 'MySQL':
        return new MySQLDataSourceAdapter(config);
      case 'Postgres':
        return new PostgresDataSourceAdapter(config);
    }
    throw new Error('Only MySQL and Postgres Data Sources are supported');
  };

  private static buildSchema = async (config: TypescriptDataSchemaGeneratorConfig): Promise<Schema> => {
    const adapter = TypescriptDataSchemaGenerator.getAdapter(config);
    await adapter.initialize();
    const schema = new Schema(new Engine(config.engine));
    const models = adapter.getModels();
    adapter.cleanup();
    models.forEach((m) => schema.addModel(m));
    return schema;
  };
}
