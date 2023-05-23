import { hasNodeToNodeEncryptionOptions, shouldEnableNodeToNodeEncryption } from '../nodeToNodeEncryption';

describe('hasNodeToNodeEncryptionOptions', () => {
  test('returns true if the search domain has NodeToNodeEncryptionOptions with value true', () => {
    const definition = {
      Resources: {
        OpenSearchDomain: {
          Properties: {
            NodeToNodeEncryptionOptions: {
              Enabled: true,
            },
          },
        },
      },
    };

    expect(hasNodeToNodeEncryptionOptions(definition)).toEqual(true);
  });

  test('returns false if the search domain has NodeToNodeEncryptionOptions with value false', () => {
    const definition = {
      Resources: {
        OpenSearchDomain: {
          Properties: {
            NodeToNodeEncryptionOptions: {
              Enabled: false,
            },
          },
        },
      },
    };

    expect(hasNodeToNodeEncryptionOptions(definition)).toEqual(false);
  });

  test('returns false if the search domain does not have NodeToNodeEncryptionOptions', () => {
    const definition = {
      Resources: {
        OpenSearchDomain: {
          Properties: {},
        },
      },
    };

    expect(hasNodeToNodeEncryptionOptions(definition)).toEqual(false);
  });

  test('returns false if the search domain has NodeToNodeEncryptionOptions with unknown value', () => {
    const definition = {
      Resources: {
        OpenSearchDomain: {
          Properties: {
            NodeToNodeEncryptionOptions: {
              Enabled: '$Token-{145}',
            },
          },
        },
      },
    };

    expect(hasNodeToNodeEncryptionOptions(definition)).toEqual(false);
  });

  test('returns false if the no search domain is found', () => {
    const definition = {
      Resources: {},
    };

    expect(hasNodeToNodeEncryptionOptions(definition)).toEqual(false);
  });
});

describe('shouldEnableNodeToNodeEncryption', () => {
  test.only('foo', () => {
    const apiName = '';
    const projectRoot = '.';
    const currentCloudBackendDir = '';
    expect(shouldEnableNodeToNodeEncryption(apiName, projectRoot, currentCloudBackendDir)).toEqual({ enabled: true, log: undefined });
  });
});
