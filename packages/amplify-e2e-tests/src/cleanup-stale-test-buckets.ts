/* eslint-disable import/no-extraneous-dependencies */
import { S3Client, Bucket, ListBucketsCommand } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { Organizations, ListAccountsCommand } from '@aws-sdk/client-organizations';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { deleteS3Bucket } from 'amplify-category-api-e2e-core';

const TEST_BUCKET_REGEX = /test/;
const BUCKET_STALE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * We define a bucket as viable for deletion if it has 'test' in the name, and if it is >6 hours old.
 */
const testBucketStalenessFilter = (bucket: S3.Bucket): boolean => {
  const isTestBucket = bucket.Name.match(TEST_BUCKET_REGEX);
  const isStaleBucket = Date.now() - bucket.CreationDate.getMilliseconds() > BUCKET_STALE_DURATION_MS;
  return isTestBucket && isStaleBucket;
};

/**
 * Get all S3 buckets in the account, and filter down to the ones we consider stale.
 */
const getStaleS3TestBuckets = async (account: AwsCredentialIdentity): Promise<Bucket[]> => {
  const s3Client = new S3Client({ credentials: account });
  const listBucketResponse = await s3Client.send(new ListBucketsCommand());
  return listBucketResponse.Buckets.filter(testBucketStalenessFilter);
};

const deleteBucket = async (account: AwsCredentialIdentity, accountIndex: number, bucket: Bucket): Promise<void> => {
  const { Name, CreationDate } = bucket;
  try {
    console.log(`[ACCOUNT ${accountIndex}] Deleting S3 Bucket ${Name} created on ${CreationDate}`);
    const s3 = new S3Client({ credentials: account });
    await deleteS3Bucket(Name, s3);
  } catch (e) {
    console.log(`[ACCOUNT ${accountIndex}] Deleting S3 Bucket ${Name} failed with error ${e.message}`);
  }
};

/**
 * Retrieve the accounts to process for potential cleanup. By default we will attempt
 * to get all accounts within the root account organization.
 */
const getAccountsToCleanup = async (): Promise<AwsCredentialIdentity[]> => {
  const sts = new STSClient({
    apiVersion: '2011-06-15',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });
  const parentAccountIdentity = await sts.send(new GetCallerIdentityCommand());
  const orgApi = new Organizations({
    apiVersion: '2016-11-28',
    // the region where the organization exists
    region: 'us-east-1',
  });
  try {
    const orgAccounts = await orgApi.send(new ListAccountsCommand({}));
    const accountCredentialPromises = orgAccounts.Accounts.map(async (account) => {
      if (account.Id === parentAccountIdentity.Account) {
        return {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        };
      }

      const randomNumber = Math.floor(Math.random() * 100000);
      const assumeRoleRes = await sts.send(
        new AssumeRoleCommand({
          RoleArn: `arn:aws:iam::${account.Id}:role/OrganizationAccountAccessRole`,
          RoleSessionName: `testSession${randomNumber}`,
          // One hour
          DurationSeconds: 1 * 60 * 60,
        }),
      );
      return {
        accessKeyId: assumeRoleRes.Credentials.AccessKeyId,
        secretAccessKey: assumeRoleRes.Credentials.SecretAccessKey,
        sessionToken: assumeRoleRes.Credentials.SessionToken,
      };
    });
    return await Promise.all(accountCredentialPromises);
  } catch (e) {
    console.error(e);
    console.log(
      'Error assuming child account role. This could be because the script is already running from within a child account. Running on current AWS account only.',
    );
    return [
      {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    ];
  }
};

const deleteBucketsForAccount = async (account: AwsCredentialIdentity, accountIndex: number): Promise<void> => {
  const buckets = await getStaleS3TestBuckets(account);
  await Promise.all(buckets.map((bucket) => deleteBucket(account, accountIndex, bucket)));
  console.log(`[ACCOUNT ${accountIndex}] Cleanup done!`);
};

/**
 * Find and delete stale s3 buckets from our e2e tests
 */
const cleanup = async (): Promise<void> => {
  const accounts = await getAccountsToCleanup();
  await Promise.all(accounts.map(deleteBucketsForAccount));
  console.log('Done cleaning all stale s3 buckets!');
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
cleanup();
