#!/usr/bin/env ts-node

/**
 * Manual E2E Cleanup Script
 *
 * Gives a human operator full control over cleaning up dirty E2E test accounts.
 * Dry-run is the DEFAULT mode — nothing is deleted unless --delete is explicitly passed.
 *
 * Usage:
 *   npx ts-node scripts/manual-cleanup.ts [options]
 *
 * Options:
 *   --account <id>       Single account to clean (can specify multiple times)
 *   --all-accounts       Clean all 13 OPS accounts
 *   --resource <type>    Resource type: stacks|policies|roles|buckets|rds|all (default: all)
 *   --region <name>      Single region (default: all enabled regions)
 *   --max-age <hours>    Only delete resources older than N hours (default: 6)
 *   --dry-run            List what would be deleted WITHOUT deleting (DEFAULT mode)
 *   --delete             Actually delete resources (requires explicit flag)
 *   --batch-size <n>     Delete N resources per account per type (default: 50)
 *   --verbose            Show detailed output
 *
 * Examples:
 *   npx ts-node scripts/manual-cleanup.ts --all-accounts --dry-run
 *   npx ts-node scripts/manual-cleanup.ts --account 111111111111 --resource stacks --delete
 *   npx ts-node scripts/manual-cleanup.ts --all-accounts --resource policies --max-age 24 --delete
 */

import { execSync } from 'child_process';
import {
  CloudFormationClient,
  ListStacksCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import {
  IAMClient,
  ListPoliciesCommand,
  ListPolicyVersionsCommand,
  DeletePolicyVersionCommand,
  ListEntitiesForPolicyCommand,
  DetachUserPolicyCommand,
  DetachGroupPolicyCommand,
  DetachRolePolicyCommand,
  DeletePolicyCommand,
  ListRolesCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand,
  DeleteRolePolicyCommand,
  ListInstanceProfilesForRoleCommand,
  RemoveRoleFromInstanceProfileCommand,
  DeleteRoleCommand,
} from '@aws-sdk/client-iam';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DeleteDBInstanceCommand,
  DescribeDBClustersCommand,
  DeleteDBClusterCommand,
} from '@aws-sdk/client-rds';

// ── Constants ────────────────────────────────────────────────────────────────

const OPS_ACCOUNTS: string[] = (process.env.OPS_ACCOUNTS || '').split(',').map(s => s.trim()).filter(Boolean);

// Legacy hardcoded accounts (kept for reference, now loaded from env):
// const _LEGACY_OPS_ACCOUNTS = [

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'eu-west-2',
  'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
  'ap-south-1', 'ap-northeast-2', 'ap-northeast-3', 'ca-central-1',
  'eu-north-1', 'eu-south-1', 'eu-west-3', 'sa-east-1', 'ap-east-1',
];

const SKIPPED_REGIONS = ['me-south-1'];

const VALID_RESOURCE_TYPES = ['stacks', 'policies', 'roles', 'buckets', 'rds', 'all'] as const;
type ResourceType = (typeof VALID_RESOURCE_TYPES)[number];

const STACK_STATUSES_TO_CHECK: StackStatus[] = [
  StackStatus.CREATE_COMPLETE,
  StackStatus.UPDATE_COMPLETE,
  StackStatus.ROLLBACK_COMPLETE,
  StackStatus.UPDATE_ROLLBACK_COMPLETE,
  StackStatus.DELETE_FAILED,
];

// The reaper (cleanup-e2e-resources.ts) treats ALL stale root stacks in test accounts
// as test stacks — it only checks staleness, not the stack name. We match that behavior
// here: any stale stack in an OPS test account is a candidate. The codebuild:build_id
// tag is still checked and displayed as extra context, but is not required for matching.
const TEST_STACK_PATTERN = /amplify-|integtest|managedtable-|searchable-|gql-|transformer-|appsync-|simplemodel|subscription-|default-ddb|sql-/i;
const PROTECTED_STACK_PATTERN = /^(CDKToolkit|BONESBootstrap|aws-sam-|amplify-login-)/i;
const TEST_POLICY_PATTERN = /rds-schema-inspector|integtest-execution-role-policy/i;
const TEST_BUCKET_PATTERN = /amplify-|integtest/i;
const TEST_RDS_PATTERN = /integtest/i;
const TEST_ROLE_PATTERN = /integtest/i;

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

interface CliOptions {
  accounts: string[];
  allAccounts: boolean;
  resourceType: ResourceType;
  region: string | null;
  maxAgeHours: number;
  dryRun: boolean;
  deleteMode: boolean;
  batchSize: number;
  verbose: boolean;
  help: boolean;
}

function printUsage(): void {
  console.log(`
Usage: npx ts-node scripts/manual-cleanup.ts [options]

Options:
  --account <id>       Single account to clean (can specify multiple times)
  --all-accounts       Clean all ${OPS_ACCOUNTS.length} OPS accounts
  --resource <type>    Resource type: stacks|policies|roles|buckets|rds|all (default: all)
  --region <name>      Single region (default: all enabled regions)
  --max-age <hours>    Only delete resources older than N hours (default: 6)
  --dry-run            List what would be deleted WITHOUT deleting (DEFAULT mode)
  --delete             Actually delete resources (requires explicit flag)
  --batch-size <n>     Delete N resources per account per type (default: 50)
  --verbose            Show detailed output
  --help               Show this help message

Examples:
  npx ts-node scripts/manual-cleanup.ts --all-accounts --dry-run
  npx ts-node scripts/manual-cleanup.ts --account 111111111111 --resource stacks --delete
  npx ts-node scripts/manual-cleanup.ts --all-accounts --resource policies --max-age 24 --delete
  npx ts-node scripts/manual-cleanup.ts --account 111111111111 --region us-east-1 --verbose
`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    accounts: [],
    allAccounts: false,
    resourceType: 'all',
    region: null,
    maxAgeHours: 6,
    dryRun: true,
    deleteMode: false,
    batchSize: 50,
    verbose: false,
    help: false,
  };

  const args = argv.slice(2);
  let i = 0;
  while (i < args.length) {
    switch (args[i]) {
      case '--account':
        i++;
        if (!args[i]) {
          console.error('Error: --account requires a value');
          process.exit(1);
        }
        opts.accounts.push(args[i]);
        break;
      case '--all-accounts':
        opts.allAccounts = true;
        break;
      case '--resource':
        i++;
        if (!args[i] || !VALID_RESOURCE_TYPES.includes(args[i] as ResourceType)) {
          console.error(`Error: --resource must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`);
          process.exit(1);
        }
        opts.resourceType = args[i] as ResourceType;
        break;
      case '--region':
        i++;
        if (!args[i]) {
          console.error('Error: --region requires a value');
          process.exit(1);
        }
        if (SKIPPED_REGIONS.includes(args[i])) {
          console.error(`Error: Region ${args[i]} is in the skip list and cannot be targeted`);
          process.exit(1);
        }
        opts.region = args[i];
        break;
      case '--max-age':
        i++;
        if (!args[i] || isNaN(Number(args[i]))) {
          console.error('Error: --max-age requires a numeric value');
          process.exit(1);
        }
        opts.maxAgeHours = Number(args[i]);
        break;
      case '--dry-run':
        opts.dryRun = true;
        opts.deleteMode = false;
        break;
      case '--delete':
        opts.deleteMode = true;
        opts.dryRun = false;
        break;
      case '--batch-size':
        i++;
        if (!args[i] || isNaN(Number(args[i]))) {
          console.error('Error: --batch-size requires a numeric value');
          process.exit(1);
        }
        opts.batchSize = Number(args[i]);
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
    i++;
  }

  return opts;
}

// ── Utility Functions ────────────────────────────────────────────────────────

function formatAge(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

function isOlderThan(date: Date | undefined, maxAgeHours: number): boolean {
  if (!date) return false;
  const ageMs = Date.now() - date.getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}

function assumeRole(accountId: string): void {
  console.log(`\n🔑 Assuming Admin role for account ${accountId}...`);
  try {
    execSync(`ada credentials update --account=${accountId} --provider=isengard --role=Admin --once`, {
      stdio: 'pipe',
      timeout: 60000,
    });
    console.log(`   ✅ Credentials updated for ${accountId}`);
  } catch (err: any) {
    const message = err.stderr ? err.stderr.toString().trim() : err.message;
    throw new Error(`Failed to assume role for account ${accountId}: ${message}`);
  }
}

// ── Cleanup Summary Tracking ─────────────────────────────────────────────────

interface CleanupSummary {
  stacks: number;
  policies: number;
  buckets: number;
  rdsInstances: number;
  rdsClusters: number;
  roles: number;
  errors: string[];
}

function newSummary(): CleanupSummary {
  return { stacks: 0, policies: 0, buckets: 0, rdsInstances: 0, rdsClusters: 0, roles: 0, errors: [] };
}

// ── CloudFormation Stack Cleanup ─────────────────────────────────────────────

async function cleanupStacks(
  region: string,
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
  summary: CleanupSummary,
): Promise<void> {
  const cfn = new CloudFormationClient({ region });

  try {
    let allStacks: Array<{
      name: string;
      status: string;
      creationTime: Date;
      age: string;
      isDeleteFailed: boolean;
    }> = [];

    let nextToken: string | undefined;
    do {
      const resp = await cfn.send(
        new ListStacksCommand({
          StackStatusFilter: STACK_STATUSES_TO_CHECK,
          NextToken: nextToken,
        }),
      );

      for (const stack of resp.StackSummaries ?? []) {
        const name = stack.StackName ?? '';
        const status = stack.StackStatus ?? '';
        const createdAt = stack.CreationTime;

        const isTestStack = TEST_STACK_PATTERN.test(name) && !PROTECTED_STACK_PATTERN.test(name);
        const hasCodebuildTag = await checkStackForCodebuildTag(cfn, name, verbose);

        if (!isTestStack && !hasCodebuildTag) continue;
        if (!isOlderThan(createdAt, maxAgeHours)) continue;

        const ageMs = createdAt ? Date.now() - createdAt.getTime() : 0;
        allStacks.push({
          name,
          status,
          creationTime: createdAt ?? new Date(),
          age: formatAge(ageMs),
          isDeleteFailed: status === StackStatus.DELETE_FAILED,
        });
      }

      nextToken = resp.NextToken;
    } while (nextToken);

    const staleCount = allStacks.length;
    console.log(`\n  [${region}] CloudFormation Stacks (${staleCount} stale):`);

    if (staleCount === 0) {
      console.log('    ✅ No stale stacks found');
      return;
    }

    const toProcess = allStacks.slice(0, batchSize);
    for (const stack of toProcess) {
      const icon = deleteMode ? '🗑️ ' : '❌';
      console.log(`    ${icon} ${stack.name}  (age: ${stack.age}, status: ${stack.status})`);

      if (deleteMode) {
        try {
          if (stack.isDeleteFailed) {
            const retainResources = await getFailedResources(cfn, stack.name);
            await cfn.send(
              new DeleteStackCommand({
                StackName: stack.name,
                RetainResources: retainResources,
              }),
            );
            console.log(`       → Delete initiated (retaining ${retainResources.length} failed resources)`);
          } else {
            await cfn.send(new DeleteStackCommand({ StackName: stack.name }));
            console.log('       → Delete initiated');
          }
        } catch (err: any) {
          const msg = `Failed to delete stack ${stack.name} in ${region}: ${err.message}`;
          console.error(`       ⚠️  ${msg}`);
          summary.errors.push(msg);
        }
      }
    }

    summary.stacks += toProcess.length;
    if (staleCount > batchSize) {
      console.log(`    ... and ${staleCount - batchSize} more (batch-size limit: ${batchSize})`);
    }
  } catch (err: any) {
    const msg = `Error listing stacks in ${region}: ${err.message}`;
    console.error(`    ⚠️  ${msg}`);
    summary.errors.push(msg);
  }
}

async function checkStackForCodebuildTag(cfn: CloudFormationClient, stackName: string, verbose: boolean): Promise<boolean> {
  try {
    const resp = await cfn.send(new DescribeStacksCommand({ StackName: stackName }));
    const tags = resp.Stacks?.[0]?.Tags ?? [];
    return tags.some((t) => t.Key === 'codebuild:build_id');
  } catch (err: any) {
    if (verbose) {
      console.log(`       (Could not check tags for ${stackName}: ${err.message})`);
    }
    return false;
  }
}

async function getFailedResources(cfn: CloudFormationClient, stackName: string): Promise<string[]> {
  const failedResources: string[] = [];
  try {
    let nextToken: string | undefined;
    do {
      const resp = await cfn.send(
        new ListStackResourcesCommand({ StackName: stackName, NextToken: nextToken }),
      );
      for (const resource of resp.StackResourceSummaries ?? []) {
        if (resource.ResourceStatus === 'DELETE_FAILED' && resource.LogicalResourceId) {
          failedResources.push(resource.LogicalResourceId);
        }
      }
      nextToken = resp.NextToken;
    } while (nextToken);
  } catch (err: any) {
    // If we can't list resources, return empty — DeleteStack will attempt without retain
  }
  return failedResources;
}

// ── IAM Policy Cleanup ───────────────────────────────────────────────────────

async function cleanupPolicies(
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
  summary: CleanupSummary,
): Promise<void> {
  // IAM is global — use us-east-1
  const iam = new IAMClient({ region: 'us-east-1' });

  try {
    let allPolicies: Array<{
      arn: string;
      name: string;
      createDate: Date;
      age: string;
      attachmentCount: number;
    }> = [];

    let marker: string | undefined;
    do {
      const resp = await iam.send(
        new ListPoliciesCommand({ Scope: 'Local', Marker: marker, MaxItems: 100 }),
      );

      for (const policy of resp.Policies ?? []) {
        const name = policy.PolicyName ?? '';
        if (!TEST_POLICY_PATTERN.test(name)) continue;
        if (!isOlderThan(policy.CreateDate, maxAgeHours)) continue;

        const ageMs = policy.CreateDate ? Date.now() - policy.CreateDate.getTime() : 0;
        allPolicies.push({
          arn: policy.Arn ?? '',
          name,
          createDate: policy.CreateDate ?? new Date(),
          age: formatAge(ageMs),
          attachmentCount: policy.AttachmentCount ?? 0,
        });
      }

      marker = resp.IsTruncated ? resp.Marker : undefined;
    } while (marker);

    const staleCount = allPolicies.length;
    console.log(`\n  [global] IAM Policies (${staleCount} stale):`);

    if (staleCount === 0) {
      console.log('    ✅ No stale policies found');
      return;
    }

    const toProcess = allPolicies.slice(0, batchSize);
    for (const policy of toProcess) {
      const icon = deleteMode ? '🗑️ ' : '❌';
      console.log(`    ${icon} ${policy.name}  (age: ${policy.age}, attachments: ${policy.attachmentCount})`);

      if (deleteMode) {
        try {
          await detachPolicyFromAllEntities(iam, policy.arn);
          await deleteNonDefaultPolicyVersions(iam, policy.arn);
          await iam.send(new DeletePolicyCommand({ PolicyArn: policy.arn }));
          console.log('       → Deleted');
        } catch (err: any) {
          const msg = `Failed to delete policy ${policy.name}: ${err.message}`;
          console.error(`       ⚠️  ${msg}`);
          summary.errors.push(msg);
        }
      }
    }

    summary.policies += toProcess.length;
    if (staleCount > batchSize) {
      console.log(`    ... and ${staleCount - batchSize} more (batch-size limit: ${batchSize})`);
    }
  } catch (err: any) {
    const msg = `Error listing IAM policies: ${err.message}`;
    console.error(`    ⚠️  ${msg}`);
    summary.errors.push(msg);
  }
}

async function detachPolicyFromAllEntities(iam: IAMClient, policyArn: string): Promise<void> {
  const resp = await iam.send(new ListEntitiesForPolicyCommand({ PolicyArn: policyArn }));

  for (const user of resp.PolicyUsers ?? []) {
    await iam.send(new DetachUserPolicyCommand({ UserName: user.UserName, PolicyArn: policyArn }));
  }
  for (const group of resp.PolicyGroups ?? []) {
    await iam.send(new DetachGroupPolicyCommand({ GroupName: group.GroupName, PolicyArn: policyArn }));
  }
  for (const role of resp.PolicyRoles ?? []) {
    await iam.send(new DetachRolePolicyCommand({ RoleName: role.RoleName, PolicyArn: policyArn }));
  }
}

async function deleteNonDefaultPolicyVersions(iam: IAMClient, policyArn: string): Promise<void> {
  const resp = await iam.send(new ListPolicyVersionsCommand({ PolicyArn: policyArn }));
  for (const version of resp.Versions ?? []) {
    if (!version.IsDefaultVersion && version.VersionId) {
      await iam.send(new DeletePolicyVersionCommand({ PolicyArn: policyArn, VersionId: version.VersionId }));
    }
  }
}

// ── IAM Role Cleanup ─────────────────────────────────────────────────────────

async function cleanupRoles(
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
  summary: CleanupSummary,
): Promise<void> {
  // IAM is global — use us-east-1
  const iam = new IAMClient({ region: 'us-east-1' });

  try {
    let allRoles: Array<{
      name: string;
      createDate: Date;
      age: string;
    }> = [];

    let marker: string | undefined;
    do {
      const resp = await iam.send(new ListRolesCommand({ Marker: marker, MaxItems: 100 }));

      for (const role of resp.Roles ?? []) {
        const name = role.RoleName ?? '';
        if (!TEST_ROLE_PATTERN.test(name)) continue;
        if (!isOlderThan(role.CreateDate, maxAgeHours)) continue;

        const ageMs = role.CreateDate ? Date.now() - role.CreateDate.getTime() : 0;
        allRoles.push({
          name,
          createDate: role.CreateDate ?? new Date(),
          age: formatAge(ageMs),
        });
      }

      marker = resp.IsTruncated ? resp.Marker : undefined;
    } while (marker);

    const staleCount = allRoles.length;
    console.log(`\n  [global] IAM Roles (${staleCount} stale):`);

    if (staleCount === 0) {
      console.log('    ✅ No stale roles found');
      return;
    }

    const toProcess = allRoles.slice(0, batchSize);
    for (const role of toProcess) {
      const icon = deleteMode ? '🗑️ ' : '❌';
      console.log(`    ${icon} ${role.name}  (age: ${role.age})`);

      if (deleteMode) {
        try {
          await cleanRoleBeforeDeletion(iam, role.name);
          await iam.send(new DeleteRoleCommand({ RoleName: role.name }));
          console.log('       → Deleted');
        } catch (err: any) {
          const msg = `Failed to delete role ${role.name}: ${err.message}`;
          console.error(`       ⚠️  ${msg}`);
          summary.errors.push(msg);
        }
      }
    }

    summary.roles += toProcess.length;
    if (staleCount > batchSize) {
      console.log(`    ... and ${staleCount - batchSize} more (batch-size limit: ${batchSize})`);
    }
  } catch (err: any) {
    const msg = `Error listing IAM roles: ${err.message}`;
    console.error(`    ⚠️  ${msg}`);
    summary.errors.push(msg);
  }
}

async function cleanRoleBeforeDeletion(iam: IAMClient, roleName: string): Promise<void> {
  // Detach managed policies
  const attachedResp = await iam.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
  for (const policy of attachedResp.AttachedPolicies ?? []) {
    if (policy.PolicyArn) {
      await iam.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }));
    }
  }

  // Delete inline policies
  const inlineResp = await iam.send(new ListRolePoliciesCommand({ RoleName: roleName }));
  for (const policyName of inlineResp.PolicyNames ?? []) {
    await iam.send(new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: policyName }));
  }

  // Remove from instance profiles
  const profilesResp = await iam.send(new ListInstanceProfilesForRoleCommand({ RoleName: roleName }));
  for (const profile of profilesResp.InstanceProfiles ?? []) {
    if (profile.InstanceProfileName) {
      await iam.send(
        new RemoveRoleFromInstanceProfileCommand({
          RoleName: roleName,
          InstanceProfileName: profile.InstanceProfileName,
        }),
      );
    }
  }
}

// ── S3 Bucket Cleanup ────────────────────────────────────────────────────────

async function cleanupBuckets(
  region: string,
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
  summary: CleanupSummary,
): Promise<void> {
  // S3 ListBuckets is global but we filter by region using HeadBucket
  const s3 = new S3Client({ region });

  try {
    const resp = await s3.send(new ListBucketsCommand({}));
    const allBuckets: Array<{
      name: string;
      creationDate: Date;
      age: string;
    }> = [];

    for (const bucket of resp.Buckets ?? []) {
      const name = bucket.Name ?? '';
      if (!TEST_BUCKET_PATTERN.test(name)) continue;
      if (!isOlderThan(bucket.CreationDate, maxAgeHours)) continue;

      // Check if bucket is in this region
      try {
        const s3ForBucket = new S3Client({ region });
        await s3ForBucket.send(new HeadBucketCommand({ Bucket: name }));
      } catch (err: any) {
        // If we get a redirect (301) or forbidden, bucket is in different region — skip
        if (err.$metadata?.httpStatusCode === 301 || err.name === 'PermanentRedirect') {
          if (verbose) console.log(`       (Skipping ${name} — different region)`);
          continue;
        }
        // 404 means bucket doesn't exist — skip
        if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') continue;
        // Other errors — try anyway
      }

      const ageMs = bucket.CreationDate ? Date.now() - bucket.CreationDate.getTime() : 0;
      allBuckets.push({
        name,
        creationDate: bucket.CreationDate ?? new Date(),
        age: formatAge(ageMs),
      });
    }

    const staleCount = allBuckets.length;
    console.log(`\n  [${region}] S3 Buckets (${staleCount} stale):`);

    if (staleCount === 0) {
      console.log('    ✅ No stale buckets found');
      return;
    }

    const toProcess = allBuckets.slice(0, batchSize);
    for (const bucket of toProcess) {
      const icon = deleteMode ? '🗑️ ' : '❌';
      console.log(`    ${icon} ${bucket.name}  (age: ${bucket.age})`);

      if (deleteMode) {
        try {
          await emptyBucket(s3, bucket.name, verbose);
          await s3.send(new DeleteBucketCommand({ Bucket: bucket.name }));
          console.log('       → Deleted');
        } catch (err: any) {
          const msg = `Failed to delete bucket ${bucket.name}: ${err.message}`;
          console.error(`       ⚠️  ${msg}`);
          summary.errors.push(msg);
        }
      }
    }

    summary.buckets += toProcess.length;
    if (staleCount > batchSize) {
      console.log(`    ... and ${staleCount - batchSize} more (batch-size limit: ${batchSize})`);
    }
  } catch (err: any) {
    const msg = `Error listing S3 buckets in ${region}: ${err.message}`;
    console.error(`    ⚠️  ${msg}`);
    summary.errors.push(msg);
  }
}

async function emptyBucket(s3: S3Client, bucketName: string, verbose: boolean): Promise<void> {
  let keyMarker: string | undefined;
  let versionIdMarker: string | undefined;
  let totalDeleted = 0;

  do {
    const resp = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: bucketName,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
        MaxKeys: 1000,
      }),
    );

    const objects: Array<{ Key: string; VersionId?: string }> = [];

    for (const version of resp.Versions ?? []) {
      if (version.Key) objects.push({ Key: version.Key, VersionId: version.VersionId });
    }
    for (const marker of resp.DeleteMarkers ?? []) {
      if (marker.Key) objects.push({ Key: marker.Key, VersionId: marker.VersionId });
    }

    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      totalDeleted += objects.length;
    }

    keyMarker = resp.NextKeyMarker;
    versionIdMarker = resp.NextVersionIdMarker;
  } while (keyMarker);

  if (verbose && totalDeleted > 0) {
    console.log(`       (Emptied ${totalDeleted} object versions from ${bucketName})`);
  }
}

// ── RDS Cleanup ──────────────────────────────────────────────────────────────

async function cleanupRds(
  region: string,
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
  summary: CleanupSummary,
): Promise<void> {
  const rds = new RDSClient({ region });

  // ── DB Instances ──
  try {
    let allInstances: Array<{
      identifier: string;
      engine: string;
      status: string;
      createTime: Date;
      age: string;
    }> = [];

    let marker: string | undefined;
    do {
      const resp = await rds.send(new DescribeDBInstancesCommand({ Marker: marker }));

      for (const instance of resp.DBInstances ?? []) {
        const identifier = instance.DBInstanceIdentifier ?? '';
        if (!TEST_RDS_PATTERN.test(identifier)) continue;
        if (instance.DBInstanceStatus !== 'available') continue;
        if (!isOlderThan(instance.InstanceCreateTime, maxAgeHours)) continue;

        const ageMs = instance.InstanceCreateTime ? Date.now() - instance.InstanceCreateTime.getTime() : 0;
        allInstances.push({
          identifier,
          engine: instance.Engine ?? 'unknown',
          status: instance.DBInstanceStatus ?? 'unknown',
          createTime: instance.InstanceCreateTime ?? new Date(),
          age: formatAge(ageMs),
        });
      }

      marker = resp.Marker;
    } while (marker);

    const instanceCount = allInstances.length;
    console.log(`\n  [${region}] RDS Instances (${instanceCount} stale):`);

    if (instanceCount === 0) {
      console.log('    ✅ No stale RDS instances found');
    } else {
      const toProcess = allInstances.slice(0, batchSize);
      for (const instance of toProcess) {
        const icon = deleteMode ? '🗑️ ' : '❌';
        console.log(
          `    ${icon} ${instance.identifier}  (engine: ${instance.engine}, status: ${instance.status}, age: ${instance.age})`,
        );

        if (deleteMode) {
          try {
            await rds.send(
              new DeleteDBInstanceCommand({
                DBInstanceIdentifier: instance.identifier,
                SkipFinalSnapshot: true,
                DeleteAutomatedBackups: true,
              }),
            );
            console.log('       → Delete initiated');
          } catch (err: any) {
            const msg = `Failed to delete RDS instance ${instance.identifier} in ${region}: ${err.message}`;
            console.error(`       ⚠️  ${msg}`);
            summary.errors.push(msg);
          }
        }
      }

      summary.rdsInstances += toProcess.length;
      if (instanceCount > batchSize) {
        console.log(`    ... and ${instanceCount - batchSize} more (batch-size limit: ${batchSize})`);
      }
    }
  } catch (err: any) {
    const msg = `Error listing RDS instances in ${region}: ${err.message}`;
    console.error(`    ⚠️  ${msg}`);
    summary.errors.push(msg);
  }

  // ── DB Clusters (Aurora) ──
  try {
    let allClusters: Array<{
      identifier: string;
      engine: string;
      status: string;
      createTime: Date;
      age: string;
    }> = [];

    let marker: string | undefined;
    do {
      const resp = await rds.send(new DescribeDBClustersCommand({ Marker: marker }));

      for (const cluster of resp.DBClusters ?? []) {
        const identifier = cluster.DBClusterIdentifier ?? '';
        if (!TEST_RDS_PATTERN.test(identifier)) continue;
        if (cluster.Status !== 'available') continue;
        if (!isOlderThan(cluster.ClusterCreateTime, maxAgeHours)) continue;

        const ageMs = cluster.ClusterCreateTime ? Date.now() - cluster.ClusterCreateTime.getTime() : 0;
        allClusters.push({
          identifier,
          engine: cluster.Engine ?? 'unknown',
          status: cluster.Status ?? 'unknown',
          createTime: cluster.ClusterCreateTime ?? new Date(),
          age: formatAge(ageMs),
        });
      }

      marker = resp.Marker;
    } while (marker);

    const clusterCount = allClusters.length;
    console.log(`\n  [${region}] RDS Clusters (${clusterCount} stale):`);

    if (clusterCount === 0) {
      console.log('    ✅ No stale RDS clusters found');
    } else {
      const toProcess = allClusters.slice(0, batchSize);
      for (const cluster of toProcess) {
        const icon = deleteMode ? '🗑️ ' : '❌';
        console.log(
          `    ${icon} ${cluster.identifier}  (engine: ${cluster.engine}, status: ${cluster.status}, age: ${cluster.age})`,
        );

        if (deleteMode) {
          try {
            await rds.send(
              new DeleteDBClusterCommand({
                DBClusterIdentifier: cluster.identifier,
                SkipFinalSnapshot: true,
              }),
            );
            console.log('       → Delete initiated');
          } catch (err: any) {
            const msg = `Failed to delete RDS cluster ${cluster.identifier} in ${region}: ${err.message}`;
            console.error(`       ⚠️  ${msg}`);
            summary.errors.push(msg);
          }
        }
      }

      summary.rdsClusters += toProcess.length;
      if (clusterCount > batchSize) {
        console.log(`    ... and ${clusterCount - batchSize} more (batch-size limit: ${batchSize})`);
      }
    }
  } catch (err: any) {
    const msg = `Error listing RDS clusters in ${region}: ${err.message}`;
    console.error(`    ⚠️  ${msg}`);
    summary.errors.push(msg);
  }
}

// ── Per-Region Cleanup Orchestrator ──────────────────────────────────────────

async function cleanupRegion(
  region: string,
  resourceType: ResourceType,
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
  summary: CleanupSummary,
): Promise<void> {
  if (resourceType === 'all' || resourceType === 'stacks') {
    await cleanupStacks(region, maxAgeHours, deleteMode, batchSize, verbose, summary);
  }

  if (resourceType === 'all' || resourceType === 'buckets') {
    await cleanupBuckets(region, maxAgeHours, deleteMode, batchSize, verbose, summary);
  }

  if (resourceType === 'all' || resourceType === 'rds') {
    await cleanupRds(region, maxAgeHours, deleteMode, batchSize, verbose, summary);
  }
}

// ── Per-Account Cleanup Orchestrator ─────────────────────────────────────────

async function cleanupAccount(
  accountId: string,
  accountIndex: number,
  totalAccounts: number,
  regions: string[],
  resourceType: ResourceType,
  maxAgeHours: number,
  deleteMode: boolean,
  batchSize: number,
  verbose: boolean,
): Promise<CleanupSummary> {
  const summary = newSummary();
  const startTime = Date.now();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Account: ${accountId} (${accountIndex}/${totalAccounts})`);
  console.log(`Regions: ${regions.length} (skipping ${SKIPPED_REGIONS.join(', ')})`);
  console.log(`Max age: ${maxAgeHours} hours`);
  console.log(`${'─'.repeat(60)}`);

  try {
    assumeRole(accountId);
  } catch (err: any) {
    console.error(`\n❌ ${err.message}`);
    console.error('   Skipping this account.\n');
    summary.errors.push(err.message);
    return summary;
  }

  // IAM is global — run once per account, not per region
  if (resourceType === 'all' || resourceType === 'policies') {
    await cleanupPolicies(maxAgeHours, deleteMode, batchSize, verbose, summary);
  }
  if (resourceType === 'all' || resourceType === 'roles') {
    await cleanupRoles(maxAgeHours, deleteMode, batchSize, verbose, summary);
  }

  // Regional resources
  for (const region of regions) {
    try {
      await cleanupRegion(region, resourceType, maxAgeHours, deleteMode, batchSize, verbose, summary);
    } catch (err: any) {
      const msg = `Unexpected error in region ${region}: ${err.message}`;
      console.error(`\n  ⚠️  ${msg}`);
      summary.errors.push(msg);
    }
  }

  // Print account summary
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY — Account ${accountId} (completed in ${elapsedSec}s)`);
  console.log(`${'='.repeat(60)}`);
  const action = deleteMode ? 'deleted' : 'would delete';
  console.log(`  Stacks:       ${summary.stacks} stale (${action})`);
  console.log(`  Policies:     ${summary.policies} stale (${action})`);
  console.log(`  Roles:        ${summary.roles} stale (${action})`);
  console.log(`  Buckets:      ${summary.buckets} stale (${action})`);
  console.log(`  RDS Instances: ${summary.rdsInstances} stale (${action})`);
  console.log(`  RDS Clusters:  ${summary.rdsClusters} stale (${action})`);
  if (summary.errors.length > 0) {
    console.log(`  Errors:       ${summary.errors.length}`);
  }
  console.log(`${'='.repeat(60)}`);

  return summary;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  // Determine accounts
  let accounts: string[];
  if (opts.allAccounts) {
    if (OPS_ACCOUNTS.length === 0) {
      console.error('Error: --all-accounts requires OPS_ACCOUNTS environment variable.');
      console.error('Set it as a comma-separated list: export OPS_ACCOUNTS="111111111111,222222222222"');
      console.error('Or use --account <id> to specify accounts individually.');
      process.exit(1);
    }
    accounts = [...OPS_ACCOUNTS];
  } else if (opts.accounts.length > 0) {
    accounts = opts.accounts;
  } else {
    console.error('Error: Must specify --account <id> or --all-accounts');
    printUsage();
    process.exit(1);
  }

  // Determine regions
  const regions = opts.region ? [opts.region] : REGIONS;

  // Print header
  const mode = opts.deleteMode ? 'DELETE MODE' : 'DRY RUN';
  console.log(`\n${'='.repeat(60)}`);
  console.log(`MANUAL E2E CLEANUP — ${mode}`);
  console.log(`${'='.repeat(60)}`);

  if (!opts.deleteMode) {
    console.log('\n🔒 DRY RUN MODE — no resources will be deleted');
    console.log('   Add --delete to actually delete resources.\n');
  } else {
    console.log('\n🔴 DELETE MODE — resources WILL be permanently deleted!\n');
  }

  console.log(`Accounts:  ${accounts.length} (${accounts.join(', ')})`);
  console.log(`Regions:   ${regions.length}${opts.region ? ` (${opts.region})` : ` (skipping ${SKIPPED_REGIONS.join(', ')})`}`);
  console.log(`Resources: ${opts.resourceType}`);
  console.log(`Max age:   ${opts.maxAgeHours} hours`);
  console.log(`Batch size: ${opts.batchSize}`);

  // Process each account
  const allSummaries: Array<{ accountId: string; summary: CleanupSummary }> = [];

  for (let i = 0; i < accounts.length; i++) {
    const accountId = accounts[i];
    const summary = await cleanupAccount(
      accountId,
      i + 1,
      accounts.length,
      regions,
      opts.resourceType,
      opts.maxAgeHours,
      opts.deleteMode,
      opts.batchSize,
      opts.verbose,
    );
    allSummaries.push({ accountId, summary });
  }

  // Print grand total
  console.log(`\n${'='.repeat(60)}`);
  console.log(`GRAND TOTAL — ${mode}`);
  console.log(`${'='.repeat(60)}`);

  let totalStacks = 0;
  let totalPolicies = 0;
  let totalRoles = 0;
  let totalBuckets = 0;
  let totalRdsInstances = 0;
  let totalRdsClusters = 0;
  let totalErrors: string[] = [];

  for (const { summary } of allSummaries) {
    totalStacks += summary.stacks;
    totalPolicies += summary.policies;
    totalRoles += summary.roles;
    totalBuckets += summary.buckets;
    totalRdsInstances += summary.rdsInstances;
    totalRdsClusters += summary.rdsClusters;
    totalErrors = totalErrors.concat(summary.errors);
  }

  const action = opts.deleteMode ? 'deleted' : 'would delete';
  console.log(`  Stacks:        ${totalStacks} (${action})`);
  console.log(`  Policies:      ${totalPolicies} (${action})`);
  console.log(`  Roles:         ${totalRoles} (${action})`);
  console.log(`  Buckets:       ${totalBuckets} (${action})`);
  console.log(`  RDS Instances: ${totalRdsInstances} (${action})`);
  console.log(`  RDS Clusters:  ${totalRdsClusters} (${action})`);

  if (totalErrors.length > 0) {
    console.log(`\n  ⚠️  ERRORS (${totalErrors.length}):`);
    for (const error of totalErrors) {
      console.log(`     • ${error}`);
    }
  } else {
    console.log('\n  ✅ No errors encountered');
  }

  console.log(`${'='.repeat(60)}\n`);

  if (totalErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n💥 Unhandled error: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
