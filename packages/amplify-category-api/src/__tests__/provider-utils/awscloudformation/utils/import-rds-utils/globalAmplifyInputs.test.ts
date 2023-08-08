import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import * as fs from 'fs-extra';
import {
  constructDefaultGlobalAmplifyInput,
  readRDSGlobalAmplifyInput,
  constructRDSGlobalAmplifyInput,
} from '../../../../../provider-utils/awscloudformation/utils/rds-input-utils';

jest.mock('fs-extra', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));
const readFileSync_mock = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const existsSync_mock = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

jest.mock('@aws-amplify/amplify-cli-core', () => {
  const original = jest.requireActual('@aws-amplify/amplify-cli-core');
  return {
    ...original,
    ApiCategoryFacade: {
      getTransformerVersion: jest.fn().mockResolvedValue(2),
    },
  };
});

describe('Amplify Input read/write from schema', () => {
  const mockContext = {} as any as $TSContext;

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('constructs valid default input parameters for MySQL datasource with global auth rule', async () => {
    const expectedGraphQLInputString = `input AMPLIFY {
      engine: String = \"mysql\"
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
      database: 'mockdatabase',
    };

    const mockInputSchema = `input AMPLIFY {
      engine: String = \"${mockValidInputs.engine}\"  
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;

    const readInputNode = await readRDSGlobalAmplifyInput(mockInputSchema);
    expect(readInputNode).toMatchSnapshot();
  });

  it('constructs the global Amplify input from given config', async () => {
    const mockValidInputs = {
      engine: 'mysql',
      host: 'mockdatabase.rds.amazonaws.com',
      port: '1010',
      database: 'mockdatabase',
    };

    const mockInputSchema = `input AMPLIFY {
      engine: String = \"${mockValidInputs.engine}\" 
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:https://docs.amplify.aws/cli/graphql/authorization-rules 
    }`;

    const userInputs = {
      host: 'mockdatabase.rds.amazonaws.com',
      port: 1010,
      database: 'mockdatabase',
    };

    const constructedInputDefinition = await constructRDSGlobalAmplifyInput(mockContext, userInputs, mockInputSchema);
    expect(constructedInputDefinition).toMatchSnapshot();
  });
});
