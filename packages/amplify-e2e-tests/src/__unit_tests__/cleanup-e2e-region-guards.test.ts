/* eslint-disable spellcheck/spell-checker, @typescript-eslint/no-explicit-any, max-classes-per-file */
import {
  getAmplifyApps,
  getOrphanRdsInstances,
  getOrphanS3TestBuckets,
  getOrphanTestIamPolicies,
  getS3Buckets,
  isUnreachableRegionError,
  testRegions,
} from '../cleanup-e2e-resources';

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

// The orphan-policy sweep lists customer-managed policies (paginated) and deletes those attached to nothing. The mock
// records which policy ARNs a DeletePolicy was issued for, so a test can assert only orphaned, stale, test-named
// policies are deleted and in-use / non-test / fresh ones are left alone.
jest.mock('@aws-sdk/client-iam', () => {
  const state: { policies: any[]; deletedArns: string[] } = { policies: [], deletedArns: [] };
  class IAMClient {
    constructor(readonly config: unknown) {}
    async send(command: any): Promise<any> {
      if (command instanceof ListPoliciesCommand) {
        return { Policies: state.policies, Marker: undefined };
      }
      if (command instanceof ListPolicyVersionsCommand) {
        return { Versions: [{ VersionId: 'v1', IsDefaultVersion: true }] };
      }
      if (command instanceof DeletePolicyCommand) {
        state.deletedArns.push(command.input.PolicyArn);
        return {};
      }
      if (command instanceof ListRolesCommand) {
        return { Roles: [] };
      }
      return {};
    }
  }
  class ListPoliciesCommand {
    constructor(readonly input: any) {}
  }
  class ListPolicyVersionsCommand {
    constructor(readonly input: any) {}
  }
  class DeletePolicyCommand {
    constructor(readonly input: any) {}
  }
  class DeletePolicyVersionCommand {
    constructor(readonly input: any) {}
  }
  class ListRolesCommand {
    constructor(readonly input: unknown) {}
  }
  class ListAttachedRolePoliciesCommand {
    constructor(readonly input: unknown) {}
  }
  class ListRolePoliciesCommand {
    constructor(readonly input: unknown) {}
  }
  class DeleteRoleCommand {
    constructor(readonly input: unknown) {}
  }
  class DetachRolePolicyCommand {
    constructor(readonly input: unknown) {}
  }
  class DeleteRolePolicyCommand {
    constructor(readonly input: unknown) {}
  }
  return {
    IAMClient,
    ListPoliciesCommand,
    ListPolicyVersionsCommand,
    DeletePolicyCommand,
    DeletePolicyVersionCommand,
    ListRolesCommand,
    ListAttachedRolePoliciesCommand,
    ListRolePoliciesCommand,
    DeleteRoleCommand,
    DetachRolePolicyCommand,
    DeleteRolePolicyCommand,
    __iamState: state,
  };
});

const { __rdsState: rdsState } = jest.requireMock('@aws-sdk/client-rds') as { __rdsState: { send: () => any } };
const { __amplifyState: amplifyState } = jest.requireMock('@aws-sdk/client-amplify') as { __amplifyState: { send: () => any } };
const { __s3State: s3State } = jest.requireMock('@aws-sdk/client-s3') as {
  __s3State: { buckets: { Name: string }[]; locationByBucket: Record<string, string | undefined>; taggingCalls: string[] };
};
const { __iamState: iamState } = jest.requireMock('@aws-sdk/client-iam') as {
  __iamState: { policies: any[]; deletedArns: string[] };
};

const account = { accountId: '123456789012', credentials: {} } as any;

let logSpy: jest.SpyInstance;

beforeEach(() => {
  rdsState.send = () => ({ DBInstances: [] });
  amplifyState.send = () => ({ apps: [] });
  s3State.buckets = [];
  s3State.locationByBucket = {};
  s3State.taggingCalls = [];
  iamState.policies = [];
  iamState.deletedArns = [];
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

describe('testRegions region-list', () => {
  it('never contains an unreachable region, so the list-driven getters (apps/stacks/RDS/CFN) never visit one', () => {
    expect(testRegions).not.toContain('me-south-1');
  });
});

describe('getOrphanTestIamPolicies', () => {
  const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day old -> stale
  const freshDate = new Date();

  it('returns only stale, test-named, unattached customer-managed policies', async () => {
    iamState.policies = [
      // orphan: test name, stale, attached to nothing -> deleted
      { PolicyName: 'amplify-orphan-policy', Arn: 'arn:aws:iam::123456789012:policy/amplify-orphan-policy', CreateDate: oldDate, AttachmentCount: 0, PermissionsBoundaryUsageCount: 0 },
      // in use: attached to a role -> kept
      { PolicyName: 'amplify-inuse-policy', Arn: 'arn:aws:iam::123456789012:policy/amplify-inuse-policy', CreateDate: oldDate, AttachmentCount: 2, PermissionsBoundaryUsageCount: 0 },
      // used as a permissions boundary -> kept
      { PolicyName: 'amplify-boundary-policy', Arn: 'arn:aws:iam::123456789012:policy/amplify-boundary-policy', CreateDate: oldDate, AttachmentCount: 0, PermissionsBoundaryUsageCount: 1 },
      // non-test name -> kept
      { PolicyName: 'company-prod-policy', Arn: 'arn:aws:iam::123456789012:policy/company-prod-policy', CreateDate: oldDate, AttachmentCount: 0, PermissionsBoundaryUsageCount: 0 },
      // too fresh -> kept
      { PolicyName: 'amplify-fresh-policy', Arn: 'arn:aws:iam::123456789012:policy/amplify-fresh-policy', CreateDate: freshDate, AttachmentCount: 0, PermissionsBoundaryUsageCount: 0 },
    ];

    const result = await getOrphanTestIamPolicies(account);

    expect(result.map((p) => p.name)).toEqual(['amplify-orphan-policy']);
    expect(result[0].arn).toBe('arn:aws:iam::123456789012:policy/amplify-orphan-policy');
  });

  it('returns nothing when no policy is an orphan (nothing to delete)', async () => {
    iamState.policies = [
      { PolicyName: 'amplify-inuse-policy', Arn: 'arn:aws:iam::123456789012:policy/amplify-inuse-policy', CreateDate: oldDate, AttachmentCount: 1, PermissionsBoundaryUsageCount: 0 },
    ];

    const result = await getOrphanTestIamPolicies(account);

    expect(result).toEqual([]);
  });
});
