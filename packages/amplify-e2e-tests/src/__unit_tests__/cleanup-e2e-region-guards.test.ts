/* eslint-disable spellcheck/spell-checker, @typescript-eslint/no-explicit-any, max-classes-per-file */
import { getAmplifyApps, getOrphanRdsInstances, isUnreachableRegionError } from '../cleanup-e2e-resources';

/**
 * These cover the region-level discovery guards that sit on cleanupAccount's Promise.all. Before this change only the
 * S3 sweep tolerated a hard-down region; getAmplifyApps / getOrphanRdsInstances / listStacks still rethrew a bare
 * ETIMEDOUT (the exact ticket-P492565382 failure), which rejected cleanupAccount and aborted cleanup for every
 * account. A bucket/app/instance in an unreachable region is scoped to that region, never a reason to abort the run.
 */

// The ticket failure: a socket timeout carries its identifier on `code` and leaves `name` as the generic 'Error',
// so a guard that only matches error *names* (InvalidClientTokenId, etc.) misses it and rethrows.
const timeoutError = (): any => Object.assign(new Error('connect ETIMEDOUT 52.95.128.1:443'), { code: 'ETIMEDOUT' });

jest.mock('@aws-sdk/client-rds', () => {
  const state: { send: () => any } = { send: () => ({ DBInstances: [] }) };
  class RDSClient {
    constructor(readonly config: unknown) {}
    async send(): Promise<any> {
      return state.send();
    }
  }
  class DescribeDBInstancesCommand {
    constructor(readonly input: unknown) {}
  }
  class DeleteDBInstanceCommand {
    constructor(readonly input: unknown) {}
  }
  return { RDSClient, DescribeDBInstancesCommand, DeleteDBInstanceCommand, __rdsState: state };
});

jest.mock('@aws-sdk/client-amplify', () => {
  const state: { send: () => any } = { send: () => ({ apps: [] }) };
  class AmplifyClient {
    constructor(readonly config: unknown) {}
    async send(): Promise<any> {
      return state.send();
    }
  }
  class ListAppsCommand {
    constructor(readonly input: unknown) {}
  }
  class DeleteAppCommand {
    constructor(readonly input: unknown) {}
  }
  class ListBackendEnvironmentsCommand {
    constructor(readonly input: unknown) {}
  }
  return { AmplifyClient, ListAppsCommand, DeleteAppCommand, ListBackendEnvironmentsCommand, __amplifyState: state };
});

const { __rdsState: rdsState } = jest.requireMock('@aws-sdk/client-rds') as { __rdsState: { send: () => any } };
const { __amplifyState: amplifyState } = jest.requireMock('@aws-sdk/client-amplify') as { __amplifyState: { send: () => any } };

const account = { accountId: '123456789012', credentials: {} } as any;

let logSpy: jest.SpyInstance;

beforeEach(() => {
  rdsState.send = () => ({ DBInstances: [] });
  amplifyState.send = () => ({ apps: [] });
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isUnreachableRegionError', () => {
  it('treats a bare ETIMEDOUT (code set, generic name) as skippable', () => {
    expect(isUnreachableRegionError(timeoutError())).toBe(true);
  });

  it('treats the recognized opt-in region error names as skippable', () => {
    expect(isUnreachableRegionError(Object.assign(new Error('x'), { name: 'InvalidClientTokenId' }))).toBe(true);
    expect(isUnreachableRegionError(Object.assign(new Error('x'), { name: 'UnrecognizedClientException' }))).toBe(true);
  });

  it('treats other connectivity codes and a message-only timeout as skippable', () => {
    expect(isUnreachableRegionError(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isUnreachableRegionError(new Error('getaddrinfo ENOTFOUND s3.me-south-1.amazonaws.com'))).toBe(true);
    expect(isUnreachableRegionError({ name: 'TimeoutError' })).toBe(true);
  });

  it('does NOT swallow a genuine programming/permission error', () => {
    expect(isUnreachableRegionError(Object.assign(new Error('boom'), { name: 'AccessDeniedException' }))).toBe(false);
    expect(isUnreachableRegionError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});

describe('getOrphanRdsInstances', () => {
  it('returns [] instead of rejecting when the region is unreachable (ETIMEDOUT)', async () => {
    const thrown = timeoutError();
    rdsState.send = () => {
      throw thrown;
    };
    await expect(getOrphanRdsInstances(account, 'me-south-1')).resolves.toEqual([]);
    const logged = logSpy.mock.calls.map(([m]) => String(m));
    expect(logged.some((m) => m.includes('Listing RDS instances for account 123456789012-me-south-1'))).toBe(true);
  });

  it('still rethrows a non-region error', async () => {
    rdsState.send = () => {
      throw Object.assign(new Error('denied'), { name: 'AccessDeniedException' });
    };
    await expect(getOrphanRdsInstances(account, 'us-east-1')).rejects.toThrow('denied');
  });
});

describe('getAmplifyApps', () => {
  it('returns [] instead of rejecting when the region is unreachable (ETIMEDOUT)', async () => {
    const thrown = timeoutError();
    amplifyState.send = () => {
      throw thrown;
    };
    await expect(getAmplifyApps(account, 'me-south-1')).resolves.toEqual([]);
    const logged = logSpy.mock.calls.map(([m]) => String(m));
    expect(logged.some((m) => m.includes('Listing apps for account 123456789012-me-south-1'))).toBe(true);
  });

  it('still rethrows a non-region error', async () => {
    amplifyState.send = () => {
      throw Object.assign(new Error('denied'), { name: 'AccessDeniedException' });
    };
    await expect(getAmplifyApps(account, 'us-east-1')).rejects.toThrow('denied');
  });
});
