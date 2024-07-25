import { isOperationAuthInputApiKey } from '../utils';

describe('test utilities', () => {
  describe('appsync-graphql', () => {
    describe('type predicates', () => {
      describe('isOperationAuthInputApiKey', () => {
        it('returns true for a stringy api key', () => {
          const apiKey = 'testApiKey';
          const apiEndpoint = 'testEndpoint';

          const args = {
            apiEndpoint,
            auth: { apiKey },
          };

          const input = {
            ...args,
            query: 'mock query',
            variables: {
              id: 'id123',
              owner: 'owner123',
            },
          };

          const { auth } = input;

          expect(isOperationAuthInputApiKey(auth)).toBeTruthy();
        });

        it('returns false for an undefined api key', () => {
          const apiEndpoint = 'testEndpoint';

          const args = {
            apiEndpoint,
            auth: { apiKey: undefined },
          };

          const input = {
            ...args,
            query: 'mock query',
            variables: {
              id: 'id123',
              owner: 'owner123',
            },
          };

          const { auth } = input;

          expect(isOperationAuthInputApiKey(auth)).toBeFalsy();
        });
      });
    });
  });
});
