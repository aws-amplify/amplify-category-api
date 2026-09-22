/* eslint-disable spellcheck/spell-checker, @typescript-eslint/no-explicit-any, max-classes-per-file */
import { getAmplifyApps, getOrphanRdsInstances, getOrphanS3TestBuckets, getS3Buckets, isUnreachableRegionError } from '../cleanup-e2e-resources';

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

// The S3 sweep resolves a bucket's region from its own LocationConstraint, then makes a regionalized call. We mock
// it so a GetBucketTagging send records the region it was invoked for, letting the test assert an unreachable-region
// bucket is skipped BEFORE any such call rather than after paying the retry cost.
jest.mock('@aws-sdk/client-s3', () => {
  const state: {
    buckets: { Name: string }[];
    locationByBucket: Record<string, string | undefined>;
    taggingCalls: string[]; // regions a GetBucketTagging client was constructed for
  } = { buckets: [], locationByBucket: {}, taggingCalls: [] };
  class S3Client {
    readonly region?: string;
    constructor(readonly config: any) {
      this.region = config?.region;
    }
    async send(command: any): Promise<any> {
      if (command instanceof ListBucketsCommand) {
        return { Buckets: state.buckets };
      }
      if (command instanceof GetBucketLocationCommand) {
        return { LocationConstraint: state.locationByBucket[command.input.Bucket] };
      }
      if (command instanceof GetBucketTaggingCommand) {
        state.taggingCalls.push(this.region ?? 'us-east-1');
        return { TagSet: [] };
      }
      return {};
    }
  }
  class ListBucketsCommand {
    constructor(readonly input: unknown) {}
  }
  class GetBucketLocationCommand {
    constructor(readonly input: any) {}
  }
  class GetBucketTaggingCommand {
    constructor(readonly input: any) {}
  }
  class DeleteBucketCommand {
    constructor(readonly input: unknown) {}
  }
  return {
    S3Client,
    ListBucketsCommand,
    GetBucketLocationCommand,
    GetBucketTaggingCommand,
    DeleteBucketCommand,
    __s3State: state,
  };
});

const { __rdsState: rdsState } = jest.requireMock('@aws-sdk/client-rds') as { __rdsState: { send: () => any } };
const { __amplifyState: amplifyState } = jest.requireMock('@aws-sdk/client-amplify') as { __amplifyState: { send: () => any } };
const { __s3State: s3State } = jest.requireMock('@aws-sdk/client-s3') as {
  __s3State: { buckets: { Name: string }[]; locationByBucket: Record<string, string | undefined>; taggingCalls: string[] };
};

const account = { accountId: '123456789012', credentials: {} } as any;

let logSpy: jest.SpyInstance;

beforeEach(() => {
  rdsState.send = () => ({ DBInstances: [] });
  amplifyState.send = () => ({ apps: [] });
  s3State.buckets = [];
  s3State.locationByBucket = {};
  s3State.taggingCalls = [];
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

describe('getS3Buckets unreachable-region skip', () => {
  // Stale = name matches /test/ and CreationDate is well before the stale horizon.
  const oldDate = new Date('2000-01-01T00:00:00Z');

  it('skips a bucket whose region is unreachable BEFORE making a regionalized call', async () => {
    s3State.buckets = [{ Name: 'amplify-test-me-south', CreationDate: oldDate } as any];
    s3State.locationByBucket = { 'amplify-test-me-south': 'me-south-1' };

    const result = await getS3Buckets(account);

    // No GetBucketTagging call was made for the unreachable region, so we did not pay the retry cost.
    expect(s3State.taggingCalls).toEqual([]);
    expect(result).toEqual([]);
    const logged = logSpy.mock.calls.map(([m]) => String(m));
    expect(logged.some((m) => m.includes('region me-south-1 is unreachable'))).toBe(true);
  });

  it('still processes a bucket in a reachable region', async () => {
    s3State.buckets = [{ Name: 'amplify-test-usw2', CreationDate: oldDate } as any];
    s3State.locationByBucket = { 'amplify-test-usw2': 'us-west-2' };

    await getS3Buckets(account);

    // The reachable region was described (the tagging client was constructed for it).
    expect(s3State.taggingCalls).toEqual(['us-west-2']);
  });
});

describe('getOrphanS3TestBuckets unreachable-region skip', () => {
  const oldDate = new Date('2000-01-01T00:00:00Z');

  it('drops an unreachable-region bucket from the returned candidates', async () => {
    s3State.buckets = [
      { Name: 'amplify-test-me-south', CreationDate: oldDate } as any,
      { Name: 'amplify-test-usw2', CreationDate: oldDate } as any,
    ];
    s3State.locationByBucket = { 'amplify-test-me-south': 'me-south-1', 'amplify-test-usw2': 'us-west-2' };

    const result = await getOrphanS3TestBuckets(account);

    expect(result.map((b) => b.name)).toEqual(['amplify-test-usw2']);
    const logged = logSpy.mock.calls.map(([m]) => String(m));
    expect(logged.some((m) => m.includes('Skipping orphan bucket amplify-test-me-south'))).toBe(true);
  });
});
