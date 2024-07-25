import { stateManager } from '@aws-amplify/amplify-cli-core';
import {
  authConfigHasApiKey,
  getAppSyncAPINames,
  getAppSyncAPIName,
  ensureNoAppSyncAPIExists,
} from '../../../../provider-utils/awscloudformation/utils/amplify-meta-utils';

jest.mock('@aws-amplify/amplify-cli-core');
const stateManager_mock = stateManager as jest.Mocked<typeof stateManager>;

describe('auth config has api key', () => {
  it('returns true when default auth is api key', () => {
    const authConfig = {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
      },
    };

    expect(authConfigHasApiKey(authConfig)).toBe(true);
  });

  it('returns true when addtl auth contains api key', () => {
    const authConfig = {
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
        {
          authenticationType: 'API_KEY',
        },
      ],
    };
    expect(authConfigHasApiKey(authConfig)).toBe(true);
  });

  it('returns false when no auth type is api key', () => {
    const authConfig = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'OTHER',
        },
        {
          authenticationType: 'OPENID',
        },
      ],
    };

    expect(authConfigHasApiKey(authConfig)).toBe(false);
  });
});

describe('API resource information utils', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  const metaWithMultipleAPIs = {
    api: {
      api1: {
        service: 'AppSync',
      },
      api2: {
        service: 'AppSync',
      },
    },
  };

  const metaWithNoAPI = {};

  it('Returns all existing AppSync API names', () => {
    stateManager_mock.getMeta = jest.fn().mockReturnValueOnce(metaWithMultipleAPIs);
    expect(getAppSyncAPINames()).toEqual(['api1', 'api2']);
  });

  it('getAppSyncAPIName returns first API when there are multiple added', () => {
    stateManager_mock.getMeta = jest.fn().mockReturnValueOnce(metaWithMultipleAPIs);
    expect(getAppSyncAPIName()).toEqual('api1');
  });

  it('getAppSyncAPIName throws when there is no API added', () => {
    stateManager_mock.getMeta = jest.fn().mockReturnValueOnce(metaWithNoAPI);
    expect(() => getAppSyncAPIName()).toThrowError(
      'You do not have AppSync API added. Use "amplify add api" or "amplify import api" to add one to your project.',
    );
  });

  it('ensureNoAppSyncAPIExists throws when there is an API added', () => {
    stateManager_mock.getMeta = jest.fn().mockReturnValueOnce(metaWithMultipleAPIs);
    expect(() => ensureNoAppSyncAPIExists()).toThrowError(
      'You already have an AppSync API named api1 in your project. Use the "amplify update api" command to update your existing AppSync API.',
    );
  });

  it('ensureNoAppSyncAPIExists does not throw when there is no API added', () => {
    stateManager_mock.getMeta = jest.fn().mockReturnValueOnce(metaWithNoAPI);
    expect(() => ensureNoAppSyncAPIExists()).not.toThrowError();
  });
});
