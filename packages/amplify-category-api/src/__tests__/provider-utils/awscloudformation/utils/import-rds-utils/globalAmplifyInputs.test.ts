import { $TSAny, $TSContext } from 'amplify-cli-core';
import { constructGlobalAmplifyInput, readGlobalAmplifyInput, validateInputConfig } from '../../../../../provider-utils/awscloudformation/utils/import-rds-utils/globalAmplifyInputs';
import { ImportedRDSType } from '../../../../../provider-utils/awscloudformation/service-walkthrough-types/import-appsync-api-types';
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

  it('constructs valid input parameters for MySQL datasource with global auth rule', async () => {
    const expectedGraphQLInputString = `input Amplify {
      engine: String = \"mysql\"  
      host: String = \"ENTER YOUR DATABASE HOSTNAME HERE\"  
      port: Int = 3306 # ENTER PORT NUMBER HERE
      database: String = \"ENTER YOUR DATABASE NAME HERE\" 
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;
    const constructedInputString = await constructGlobalAmplifyInput(mockContext, ImportedRDSType.MYSQL);
    expect(constructedInputString?.replace(/\s/g, '')).toEqual(expectedGraphQLInputString.replace(/\s/g, ''));
  });

  it('reads the input arguments for database connection details', async () => {
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

    const readInputs = await readGlobalAmplifyInput(mockContext, '');
    
    expect(readInputs).toEqual(mockValidInputs);
  });

  it('reports missing input arguments for database connection details', async () => {
    const mockInvalidInputs = {
      engine: 'mysql',
      port: '1010',
      database: 'mockdatabase'
    };

    try {
      await validateInputConfig(mockContext, mockInvalidInputs);
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
      await validateInputConfig(mockContext, mockInvalidInputs);
      fail('invalid input configuration is not reported');
    }
    catch(error) {
      expect(error?.message).toEqual('The database connection parameters: host, might be invalid. Correct them in the schema and re-run.');
    }
  });
});
