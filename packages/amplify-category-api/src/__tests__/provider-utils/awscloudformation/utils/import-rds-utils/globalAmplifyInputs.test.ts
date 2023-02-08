import { $TSAny, $TSContext } from 'amplify-cli-core';
import { constructDefaultGlobalAmplifyInput, readRDSGlobalAmplifyInput, getRDSDBConfigFromAmplifyInput, constructRDSGlobalAmplifyInput } from '@aws-amplify/graphql-transformer-core';
import { ImportedRDSType } from '../../../../../../../amplify-graphql-transformer-core/src/types/import-appsync-api-types';
import * as fs from 'fs-extra';

jest.mock('fs-extra', () => ({
  readFileSync: jest.fn(),
}));
const readFileSync_mock = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

jest.mock('amplify-cli-core', () => {
  const original = jest.requireActual('amplify-cli-core');
  return {
    ...original,
    ApiCategoryFacade: {
      getTransformerVersion: jest.fn().mockResolvedValue(2),
    },
  };
});

describe('Amplify Input read/write from schema', () => {
  const mockContext = {} as $TSAny as $TSContext;

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('constructs valid default input parameters for MySQL datasource with global auth rule', async () => {
    const expectedGraphQLInputString = `input Amplify {
      engine: String = \"mysql\"  
      host: String = \"ENTER YOUR DATABASE HOSTNAME HERE\"  
      port: Int = 3306 # ENTER PORT NUMBER HERE
      database: String = \"ENTER YOUR DATABASE NAME HERE\" 
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;
    const constructedInputString = await constructDefaultGlobalAmplifyInput(mockContext, ImportedRDSType.MYSQL);
    expect(constructedInputString?.replace(/\s/g, '')).toEqual(expectedGraphQLInputString.replace(/\s/g, ''));
  });

  it('reads global Amplify input type in the schema', async () => {
    const mockValidInputs = {
      engine: 'mysql',
      host: 'mockdatabase.rds.amazonaws.com',
      port: '1010',
      database: 'mockdatabase'
    };

    const mockInputSchema = `input Amplify {
      engine: String = \"${mockValidInputs.engine}\"  
      host: String = \"${mockValidInputs.host}\"  
      port: Int = ${mockValidInputs.port} # ENTER PORT NUMBER HERE
      database: String = \"${mockValidInputs.database}\" 
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;

    readFileSync_mock.mockReturnValue(mockInputSchema);

    const readInputNode = await readRDSGlobalAmplifyInput('mock/path');
    expect(readInputNode).toMatchSnapshot();
  });

  it('fetch DB config from the input arguments for database connection details', async () => {
    const mockValidInputs = {
      engine: 'mysql',
      host: 'mockdatabase.rds.amazonaws.com',
      port: '1010',
      database: 'mockdatabase'
    };

    const mockInputSchema = `input Amplify {
      engine: String = \"${mockValidInputs.engine}\"  
      host: String = \"${mockValidInputs.host}\"  
      port: Int = ${mockValidInputs.port} # ENTER PORT NUMBER HERE
      database: String = \"${mockValidInputs.database}\" 
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;
    readFileSync_mock.mockReturnValue(mockInputSchema);

    const readInputs = await readRDSGlobalAmplifyInput('');
    const readConfig = await getRDSDBConfigFromAmplifyInput(mockContext, readInputs);

    expect(readConfig).toEqual(mockValidInputs);
  });

  it('constructs the global Amplify input from given config', async () => {
    const mockValidInputs = {
      engine: 'mysql',
      host: 'mockdatabase.rds.amazonaws.com',
      port: '1010',
      database: 'mockdatabase'
    };

    const mockInputSchema = `input Amplify {
      engine: String = \"${mockValidInputs.engine}\"  
      host: String = \"${mockValidInputs.host}\"  
      port: Int = ${mockValidInputs.port} # ENTER PORT NUMBER HERE
      database: String = \"${mockValidInputs.database}\" 
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;

    readFileSync_mock.mockReturnValue(mockInputSchema);

    const readInputNode = await readRDSGlobalAmplifyInput('mock/path');

    const userInputs = {
      host: 'otherdatabase.rds.amazonaws.com',
      port: 2020,
      database: 'otherdatabase'
    };

    const constructedInputDefinition = await constructRDSGlobalAmplifyInput(mockContext, userInputs, '');
    expect(constructedInputDefinition).toMatchSnapshot();
  });

  it('reports missing input arguments for database connection details', async () => {
    const mockInvalidInputs = {
      engine: 'mysql',
      port: '1010',
      database: 'mockdatabase'
    };

    try {
      // await validateRDSInputDBConfig(mockContext, mockInvalidInputs);
      fail('invalid input configuration is not reported');
    }
    catch(error) {
      expect(error?.message).toEqual('The database connection parameters: host, are missing. Specify them in the schema and re-run.');
    }
  });

  it('reports invalid input arguments for database connection details', async () => {
    const mockInvalidInputs = {
      engine: 'mysql',
      host: 'ENTER YOUR DATABASE HOSTNAME HERE', //invalid entry
      port: '1010',
      database: 'mockdatabase'
    };

    try {
      // await validateRDSInputDBConfig(mockContext, mockInvalidInputs);
      fail('invalid input configuration is not reported');
    }
    catch(error) {
      expect(error?.message).toEqual('The database connection parameters: host, might be invalid. Correct them in the schema and re-run.');
    }
  });
});
