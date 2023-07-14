import * as os from 'os';
import { ImportedRDSType, ImportedDataSourceConfig } from '@aws-amplify/graphql-transformer-core';
import { DataSourceAdapter, MySQLDataSourceAdapter, MySQLDataSourceConfig } from '../datasource-adapter';
import { Engine, Schema } from '../schema-representation';
import { generateGraphQLSchema } from './generate-schema';

type AmplifyInputEntry = {
  name: string;
  type: string;
  default: string | number;
  comment?: string | undefined;
};

export const generateRDSSchema = async (databaseConfig: ImportedDataSourceConfig): Promise<string> => {
  // Establish the connection
  let adapter: DataSourceAdapter;
  let schema: Schema;
  switch (databaseConfig.engine) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLDataSourceAdapter(databaseConfig as MySQLDataSourceConfig);
      schema = new Schema(new Engine('MySQL'));
      break;
    default:
      console.error('Only MySQL Data Source is supported.');
  }

  try {
    await adapter.initialize();
  } catch (error) {
    console.error(
      'Failed to connect to the specified RDS Data Source. Check the connection details in the schema and re-try. Use "amplify api update-secrets" to update the user credentials.',
    );
    throw error;
  }

  const models = await adapter.getModels();
  adapter.cleanup();
  models.forEach((m) => schema.addModel(m));

  const schemaString =
    (await constructDefaultGlobalAmplifyInput(databaseConfig.engine, false)) + os.EOL + os.EOL + generateGraphQLSchema(schema);
  return schemaString;
};

const getGlobalAmplifyInputEntries = async (
  dataSourceType = ImportedRDSType.MYSQL,
  includeAuthRule = true,
): Promise<AmplifyInputEntry[]> => {
  const inputs: AmplifyInputEntry[] = [
    {
      name: 'engine',
      type: 'String',
      default: dataSourceType,
    },
  ];

  if (includeAuthRule) {
    inputs.push({
      name: 'globalAuthRule',
      type: 'AuthRule',
      default: '{ allow: public }',
      comment: `This "input" configures a global authorization rule to enable public access to all models in this schema.
    Learn more about authorization rules here: https://docs.amplify.aws/lib/graphql/auth-rules/`,
    });
  }
  return inputs;
};

const constructDefaultGlobalAmplifyInput = async (dataSourceType: ImportedRDSType, includeAuthRule: boolean): Promise<string> => {
  const inputs = await getGlobalAmplifyInputEntries(dataSourceType, includeAuthRule);
  const inputsString = inputs.reduce(
    (acc: string, input): string =>
      acc +
      ` ${input.name}: ${input.type} = ${input.type === 'String' ? '"' + input.default + '"' : input.default} ${
        input.comment ? '# ' + input.comment : ''
      } \n`,
    '',
  );
  return `input Amplify {\n${inputsString}}\n`;
};
