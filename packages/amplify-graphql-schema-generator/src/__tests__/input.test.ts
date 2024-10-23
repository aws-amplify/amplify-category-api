import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { constructDefaultGlobalAmplifyInput, readRDSGlobalAmplifyInput, constructRDSGlobalAmplifyInput } from '../input';
import { parse } from 'graphql';

jest.mock('fs-extra', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

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
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('constructs valid default input parameters for MySQL datasource with global auth rule', async () => {
    const authDocLink = 'https://docs.amplify.aws/cli/graphql/authorization-rules';
    const expectedGraphQLInputString = `input AMPLIFY {
      engine: String = \"mysql\"
      globalAuthRule: AuthRule = { allow: public } # This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:${authDocLink}
    }`;
    const constructedInputString = constructDefaultGlobalAmplifyInput(ImportedRDSType.MYSQL, true, authDocLink);
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

    const readInputNode = readRDSGlobalAmplifyInput(parse(mockInputSchema));
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

    const constructedInputDefinition = constructRDSGlobalAmplifyInput(userInputs, parse(mockInputSchema));
    expect(constructedInputDefinition).toMatchSnapshot();
  });
});
