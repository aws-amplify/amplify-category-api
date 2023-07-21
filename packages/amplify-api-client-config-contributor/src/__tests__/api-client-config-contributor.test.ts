import { ApiClientConfigContributor } from '../api-client-config-contributor';

describe('ApiClientConfigContributor', () => {
  test('has contribute function', () => {
    const contributor = new ApiClientConfigContributor();
    expect(contributor.contribute).toBeDefined();
  });

  test('returns empty object if output has no api output', () => {
    const contributor = new ApiClientConfigContributor();
    expect(contributor.contribute({})).toEqual({});
  });

  test('performs mapping', () => {
    const output = {
      apiOutput: {
        version: '1' as '1',
        payload: {
          awsAppsyncRegion: 'us-east-1',
          awsAppsyncApiEndpoint: 'http://api',
          awsAppsyncAuthenticationType: 'api-key',
          awsAppsyncApiKey: 'mock-api-key',
        },
      },
    };
    const contributor = new ApiClientConfigContributor();
    expect(contributor.contribute(output)).toEqual({
      aws_appsync_apiKey: 'mock-api-key',
      aws_appsync_authenticationType: 'api-key',
      aws_appsync_graphqlEndpoint: 'http://api',
      aws_appsync_region: 'us-east-1',
    });
  });

  test('ignores unused params', () => {
    const output = {
      apiOutput: {
        version: '1' as '1',
        payload: {
          awsAppsyncApiEndpoint: 'http://api',
          fakeParam: 'fakeValue',
        },
      },
    };
    const contributor = new ApiClientConfigContributor();
    expect(contributor.contribute(output)).toEqual({
      aws_appsync_graphqlEndpoint: 'http://api',
    });
  });
});
