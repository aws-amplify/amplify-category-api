import {
  $TSContext, $TSObject,
} from 'amplify-cli-core';
import { InvalidDirectiveError } from 'graphql-transformer-core';
import { transformCategoryStack } from '../index';

jest.mock('path');
jest.mock('amplify-cli-core', () => ({
  ...(jest.requireActual('amplify-cli-core') as $TSObject),
  pathManager: {
    getBackendDirPath: jest.fn().mockReturnValue('mockbackendDirPath'),
    findProjectRoot: jest.fn().mockReturnValue('mockProject'),
  },
  stateManager: {
    resourceInputsJsonExists: jest.fn().mockReturnValue(true),
  },
  buildOverrideDir: jest
    .fn()
    .mockRejectedValueOnce(new Error('mock build dir message'))
    .mockResolvedValueOnce(true),
  AmplifySupportedService: {
    APPSYNC: 'AppSync',
  },
  AmplifyCategories: {
    API: 'api',
  },
}));

const mockContext: $TSContext = ({
  amplify: {
    invokePluginMethod: jest.fn().mockRejectedValue(new InvalidDirectiveError('mock invalid directive')),
  },
  input: {
    options: {},
  },
} as unknown) as $TSContext;
test('throws amplify exception when building overrides failed', async () => {
  await expect(() => transformCategoryStack(mockContext, { service: 'AppSync' })).rejects.toThrowError(expect.objectContaining({
    classification: 'ERROR',
    name: 'InvalidOverrideError',
    link: 'https://docs.amplify.aws/cli/graphql/override/',
    message: 'mock build dir message',
  }));
});

test('throws amplify error when calling compile schema', async () => {
  await expect(() => transformCategoryStack(mockContext, { service: 'AppSync' })).rejects.toThrowError(expect.objectContaining({
    classification: 'ERROR',
    name: 'InvalidDirectiveError',
    message: 'mock invalid directive',
  }));
});
