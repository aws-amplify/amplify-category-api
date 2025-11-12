import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { isDataStoreEnabled as isDataStoreEnabledAtDirectory } from 'graphql-transformer-core';
import { jest } from '@jest/globals';
import { isDataStoreEnabled } from '../../category-utils/is-datastore-enabled';
import { contextUtil } from '../../category-utils/context-util';

jest.mock('graphql-transformer-core');
jest.mock('../../category-utils/context-util');

const isDataStoreEnabledAtDirectoryMock = isDataStoreEnabledAtDirectory as jest.MockedFunction<typeof isDataStoreEnabledAtDirectory>;
const contextUtilMock = contextUtil as jest.Mocked<typeof contextUtil>;

const MOCK_RESOURCE_DIR = 'resource/dir';
const MOCK_CONTEXT = {} as unknown as $TSContext;

describe('isDataStoreEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes the underlying utility methods, and returns true if utility returns true', async () => {
    contextUtilMock.getResourceDir.mockResolvedValue(MOCK_RESOURCE_DIR);
    isDataStoreEnabledAtDirectoryMock.mockResolvedValue(true);

    await expect(isDataStoreEnabled(MOCK_CONTEXT)).resolves.toEqual(true);

    expect(contextUtilMock.getResourceDir).toHaveBeenCalledWith(MOCK_CONTEXT, { forceCompile: true });
    expect(isDataStoreEnabledAtDirectoryMock).toHaveBeenCalledWith(MOCK_RESOURCE_DIR);
  });

  it('invokes the underlying utility methods, and returns false if utility returns false', async () => {
    contextUtilMock.getResourceDir.mockResolvedValue(MOCK_RESOURCE_DIR);
    isDataStoreEnabledAtDirectoryMock.mockResolvedValue(false);

    await expect(isDataStoreEnabled(MOCK_CONTEXT)).resolves.toEqual(false);

    expect(contextUtilMock.getResourceDir).toHaveBeenCalledWith(MOCK_CONTEXT, { forceCompile: true });
    expect(isDataStoreEnabledAtDirectoryMock).toHaveBeenCalledWith(MOCK_RESOURCE_DIR);
  });
});
