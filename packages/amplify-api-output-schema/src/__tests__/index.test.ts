import { versionedApiOutputSchema } from '..';

describe('Output Schema', () => {
  test('parses valid schema', () => {
    expect(() =>
      versionedApiOutputSchema.parse({
        version: '1',
        payload: {
          awsAppsyncRegion: 'us-east-1',
          awsAppsyncApiEndpoint: 'http://api',
          awsAppsyncAuthenticationType: 'api-key',
          awsAppsyncApiKey: 'fake-api-key',
        },
      }),
    ).not.toThrow();
  });

  test('throws error when parsing invalid schema', () => {
    expect(() => versionedApiOutputSchema.parse(12)).toThrowErrorMatchingSnapshot();
  });

  test('throws error when missing required paramse', () => {
    expect(() =>
      versionedApiOutputSchema.parse({
        version: '1',
        payload: {
          awsAppsyncRegion: 'us-east-1',
          // awsAppsyncApiEndpoint: 'http://api',
          awsAppsyncAuthenticationType: 'api-key',
          awsAppsyncApiKey: 'fake-api-key',
        },
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  test('throws version is not matching', () => {
    expect(() =>
      versionedApiOutputSchema.parse({
        version: '2',
        payload: {
          awsAppsyncRegion: 'us-east-1',
          awsAppsyncApiEndpoint: 'http://api',
          awsAppsyncAuthenticationType: 'api-key',
          awsAppsyncApiKey: 'fake-api-key',
        },
      }),
    ).toThrowErrorMatchingSnapshot();
  });
});
