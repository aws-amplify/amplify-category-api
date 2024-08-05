import { $TSContext, FeatureFlags, pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import { parse } from 'graphql';
import { collectDirectivesByType } from 'graphql-transformer-core';
import {
  displayAuthNotification,
  hasFieldAuthDirectives,
  notifyFieldAuthSecurityChange,
  notifyListQuerySecurityChange,
  notifySecurityEnhancement,
} from '../../force-updates/auth-notifications';

jest.mock('@aws-amplify/amplify-cli-core');

const FeatureFlagsMock = FeatureFlags as jest.Mocked<typeof FeatureFlags>;
FeatureFlagsMock.getNumber.mockReturnValue(2);

const stateManagerMock = stateManager as jest.Mocked<typeof stateManager>;
// eslint-disable-next-line spellcheck/spell-checker
stateManagerMock.getCLIJSON.mockReturnValue({ features: { graphqltransformer: {} } });

const contextMock = {
  amplify: {},
  parameters: {
    first: 'resourceName',
  },
} as unknown as $TSContext;

describe('displayAuthNotification', () => {
  it('level "off" returns true', () => {
    const map: any = collectDirectivesByType(`
      type MyModel @model(subscriptions: { level: off }) {
        id: ID!
      }
    `);
    const set: Set<string> = new Set(['MyModel']);

    expect(displayAuthNotification(map, set)).toBe(true);
  });

  it('level "null" returns true', () => {
    const map: any = collectDirectivesByType(`
      type MyModel @model(subscriptions: { level: null }) {
        id: ID!
      }
    `);
    const set: Set<string> = new Set(['MyModel']);

    expect(displayAuthNotification(map, set)).toBe(true);
  });

  it('subscriptions is null returns true', () => {
    const map: any = collectDirectivesByType(`
      type MyModel @model(subscriptions: null) {
        id: ID!
      }
    `);
    const set: Set<string> = new Set(['MyModel']);

    expect(displayAuthNotification(map, set)).toBe(true);
  });

  it('"public" returns false', () => {
    const map: any = collectDirectivesByType(`
      type MyModel @model(subscriptions: { level: public }) {
        id: ID!
      }
    `);
    const set: Set<string> = new Set(['MyModel']);

    expect(displayAuthNotification(map, set)).toBe(false);
  });

  it('"on" returns false', () => {
    const map: any = collectDirectivesByType(`
      type MyModel @model(subscriptions: { level: on }) {
        id: ID!
      }
    `);
    const set: Set<string> = new Set(['MyModel']);

    expect(displayAuthNotification(map, set)).toBe(false);
  });

  it('absent value returns false', () => {
    const map: any = collectDirectivesByType(`
      type MyModel @model {
        id: ID!
      }
    `);
    const set: Set<string> = new Set(['MyModel']);

    expect(displayAuthNotification(map, set)).toBe(false);
  });
});

describe('hasFieldAuthDirectives', () => {
  it('returns types with field auth directives', () => {
    const doc = parse(`
      type TypeWithFieldAuth @auth(rules: { allow: private, operations: [read] }) {
        fieldWithAuth: String! @auth(rules: { allow: groups, group: "admin" })
      }

      type TypeWithoutFieldAuth @auth(rules: { allow: private, operations: [read] }) {
        fieldWithoutAuth: String!
      }
    `);

    const result = hasFieldAuthDirectives(doc);

    expect(result).toContain('TypeWithFieldAuth');
    expect(result).not.toContain('TypeWithoutFieldAuth');
  });

  it('returns empty set when no field auth', () => {
    const doc = parse(`
      type TypeWithoutFieldAuth @auth(rules: { allow: private, operations: [read] }) {
        fieldWithoutAuth: String!
      }
    `);

    const result = hasFieldAuthDirectives(doc);
    expect(result.size).toBe(0);
  });

  it('returns empty set with nullable and field auth', () => {
    const doc = parse(`
      type TypeWithFieldAuth @auth(rules: { allow: private, operations: [read] }) {
        fieldWithAuth: String @auth(rules: { allow: groups, group: "admin" })
      }
    `);

    const result = hasFieldAuthDirectives(doc);
    expect(result.size).toBe(0);
  });
});

describe('push notifications', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('notifyFieldAuthSecurityChange should exit without fail when there is not api resource directory', async () => {
    (<any>FeatureFlags.getBoolean).mockReturnValue(true);
    (<any>pathManager.getResourceDirectoryPath).mockReturnValue('path-to-non-existing-resource-directory');
    (<any>stateManager.getMeta).mockReturnValue({
      api: {
        'test-api-dev': {
          service: 'AppSync',
          output: {
            name: 'test-api-dev',
          },
        },
      },
    });
    (<any>FeatureFlags.ensureFeatureFlag).mockImplementation(() => {
      /* noop */
    });
    await notifyFieldAuthSecurityChange(contextMock);
    // eslint-disable-next-line spellcheck/spell-checker
    expect(<any>FeatureFlags.ensureFeatureFlag).toHaveBeenCalledWith('graphqltransformer', 'showFieldAuthNotification');
  });

  it('notifyListQuerySecurityChange should exit without fail when there is not api resource directory', async () => {
    (<any>pathManager.getResourceDirectoryPath).mockReturnValue('path-to-non-existing-resource-directory');
    (<any>stateManager.getMeta).mockReturnValue({
      api: {
        'test-api-dev': {
          service: 'AppSync',
          output: {
            name: 'test-api-dev',
          },
        },
      },
    });
    (<any>FeatureFlags.ensureFeatureFlag).mockImplementation(() => {
      /* noop */
    });
    await notifyListQuerySecurityChange(contextMock);
  });

  it('notifySecurityEnhancement should exit without fail when there is not api resource directory', async () => {
    (<any>FeatureFlags.getBoolean).mockReturnValue(true);
    (<any>pathManager.getResourceDirectoryPath).mockReturnValue('path-to-non-existing-resource-directory');
    (<any>stateManager.getMeta).mockReturnValue({
      api: {
        'test-api-dev': {
          service: 'AppSync',
          output: {
            name: 'test-api-dev',
          },
        },
      },
    });
    (<any>FeatureFlags.ensureFeatureFlag).mockImplementation(() => {
      /* noop */
    });
    await notifySecurityEnhancement(contextMock);
    // eslint-disable-next-line spellcheck/spell-checker
    expect(<any>FeatureFlags.ensureFeatureFlag).toHaveBeenCalledWith('graphqltransformer', 'securityEnhancementNotification');
  });
});
