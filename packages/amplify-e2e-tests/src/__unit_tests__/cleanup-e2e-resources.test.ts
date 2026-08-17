/* eslint-disable spellcheck/spell-checker, @typescript-eslint/no-explicit-any, max-classes-per-file */
import { getOrphanS3TestBuckets, getS3Buckets } from '../cleanup-e2e-resources';

type MockState = {
  listBuckets: () => any;
  getBucketLocation: (bucketName: string) => any;
  getBucketTagging: (bucketName: string, region?: string) => any;
  calls: { command: string; bucket?: string; region?: string }[];
};

jest.mock('@aws-sdk/client-s3', () => {
  const state: MockState = {
    listBuckets: () => ({ Buckets: [] }),
    getBucketLocation: () => ({ LocationConstraint: 'us-east-1' }),
    getBucketTagging: () => ({ TagSet: [] }),
    calls: [],
  };

  class ListBucketsCommand {
    readonly commandName = 'ListBuckets';
    constructor(readonly input: unknown) {}
  }
  class GetBucketLocationCommand {
    readonly commandName = 'GetBucketLocation';
    constructor(readonly input: { Bucket: string }) {}
  }
  class GetBucketTaggingCommand {
    readonly commandName = 'GetBucketTagging';
    constructor(readonly input: { Bucket: string }) {}
  }

  class S3Client {
    constructor(readonly config: { region?: string }) {}

    async send(command: any): Promise<any> {
      const bucket = command.input?.Bucket;
      state.calls.push({ command: command.commandName, bucket, region: this.config.region });
      switch (command.commandName) {
        case 'ListBuckets':
          return state.listBuckets();
        case 'GetBucketLocation':
          return state.getBucketLocation(bucket);
        case 'GetBucketTagging':
          return state.getBucketTagging(bucket, this.config.region);
        default:
          throw new Error(`Unexpected command ${command.commandName}`);
      }
    }
  }

  return { S3Client, ListBucketsCommand, GetBucketLocationCommand, GetBucketTaggingCommand, mockState: state };
});

const { mockState } = jest.requireMock('@aws-sdk/client-s3') as { mockState: MockState };

const account = { accountId: '123456789012', credentials: {} } as unknown as Parameters<typeof getS3Buckets>[0];

// `testBucketStalenessFilter` only considers buckets whose name matches /test/ and that are older than 6 hours.
const staleCreationDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
const bucketRegions: Record<string, string> = {
  'amplify-test-bucket-alpha': 'us-east-2',
  'amplify-test-bucket-dead': 'me-south-1',
  'amplify-test-bucket-omega': 'eu-west-2',
};
const allBuckets = Object.keys(bucketRegions).map((Name) => ({ Name, CreationDate: staleCreationDate }));

/**
 * The failure from ticket P492565382: a hard-down region times out at the socket level, so the error carries
 * `code: ETIMEDOUT` and a `name` that matches none of the specifically handled S3 error names.
 */
const timeoutError = (): Error => Object.assign(new Error('connect ETIMEDOUT 52.95.128.1:443'), { code: 'ETIMEDOUT' });

let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  mockState.calls = [];
  mockState.listBuckets = () => ({ Buckets: allBuckets });
  mockState.getBucketLocation = (bucketName) => ({ LocationConstraint: bucketRegions[bucketName] });
  mockState.getBucketTagging = (bucketName) => ({ TagSet: [{ Key: 'codebuild:build_id', Value: `job-${bucketName}` }] });
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getS3Buckets', () => {
  it('skips a bucket whose region is unreachable and still returns the buckets of every other region', async () => {
    mockState.getBucketTagging = (bucketName, region) => {
      if (region === 'me-south-1') {
        throw timeoutError();
      }
      return { TagSet: [{ Key: 'codebuild:build_id', Value: `job-${bucketName}` }] };
    };

    const buckets = await getS3Buckets(account);

    expect(buckets.map((bucket) => bucket.name)).toEqual(['amplify-test-bucket-alpha', 'amplify-test-bucket-omega']);
    expect(buckets.map((bucket) => bucket.region)).toEqual(['us-east-2', 'eu-west-2']);
    // The dead region really was attempted, otherwise this test would pass without exercising the guard.
    expect(mockState.calls).toContainEqual({ command: 'GetBucketTagging', bucket: 'amplify-test-bucket-dead', region: 'me-south-1' });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('(opt-in region failure) Describing bucket amplify-test-bucket-dead for account 123456789012-me-south-1'),
      expect.any(String),
    );
  });

  it('keeps sweeping the remaining regions when resolving a bucket region times out', async () => {
    mockState.getBucketLocation = (bucketName) => {
      if (bucketRegions[bucketName] === 'me-south-1') {
        throw timeoutError();
      }
      return { LocationConstraint: bucketRegions[bucketName] };
    };

    const buckets = await getS3Buckets(account);

    expect(buckets.map((bucket) => bucket.name)).toEqual(['amplify-test-bucket-alpha', 'amplify-test-bucket-omega']);
  });

  it('returns no buckets instead of rejecting when the account cannot be listed at all', async () => {
    mockState.listBuckets = () => {
      throw timeoutError();
    };

    await expect(getS3Buckets(account)).resolves.toEqual([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('(opt-in region failure) Listing S3 buckets for account 123456789012'));
  });

  it('still records buckets that have no tag set, and still skips buckets with an InvalidToken failure', async () => {
    mockState.getBucketTagging = (bucketName) => {
      if (bucketName === 'amplify-test-bucket-alpha') {
        throw Object.assign(new Error('no tags'), { name: 'NoSuchTagSet' });
      }
      if (bucketName === 'amplify-test-bucket-dead') {
        throw Object.assign(new Error('invalid token'), { name: 'InvalidToken' });
      }
      return { TagSet: [{ Key: 'codebuild:build_id', Value: `job-${bucketName}` }] };
    };

    const buckets = await getS3Buckets(account);

    expect(buckets).toEqual([
      { name: 'amplify-test-bucket-alpha', region: 'us-east-2' },
      { name: 'amplify-test-bucket-omega', jobId: 'job-amplify-test-bucket-omega', region: 'eu-west-2' },
    ]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping processing 123456789012, bucket amplify-test-bucket-dead'),
      expect.any(Error),
    );
  });
});

describe('getOrphanS3TestBuckets', () => {
  it('skips the bucket in the unreachable region and still returns the others', async () => {
    mockState.getBucketLocation = (bucketName) => {
      if (bucketRegions[bucketName] === 'me-south-1') {
        throw timeoutError();
      }
      return { LocationConstraint: bucketRegions[bucketName] };
    };

    const orphanBuckets = await getOrphanS3TestBuckets(account);

    expect(orphanBuckets).toEqual([
      { name: 'amplify-test-bucket-alpha', region: 'us-east-2' },
      { name: 'amplify-test-bucket-omega', region: 'eu-west-2' },
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('(opt-in region failure) Resolving the region of bucket amplify-test-bucket-dead for account 123456789012'),
    );
  });

  it('returns no buckets instead of rejecting when the account cannot be listed at all', async () => {
    mockState.listBuckets = () => {
      throw timeoutError();
    };

    await expect(getOrphanS3TestBuckets(account)).resolves.toEqual([]);
  });
});
