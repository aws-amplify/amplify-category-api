#!/usr/bin/env ts-node

/**
 * E2E Resource Manager — Shared discovery and cleanup for test resources.
 *
 * Usage:
 *   yarn cloud-find-garbage [accountId]           # Discovery only
 *   yarn cloud-cleanup [accountId] [--dry-run]    # Discover then delete
 *
 * When accountId is omitted, fans out across all org accounts.
 */

import {
  IAMClient,
  ListPoliciesCommand,
  ListPolicyVersionsCommand,
  DeletePolicyVersionCommand,
  DeletePolicyCommand,
  ListRolesCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  DeleteRolePolicyCommand,
  ListInstanceProfilesForRoleCommand,
  RemoveRoleFromInstanceProfileCommand,
  DeleteInstanceProfileCommand,
  Policy,
  Role,
} from '@aws-sdk/client-iam';
import { CloudFormationClient, ListStacksCommand, DeleteStackCommand, StackStatus, StackSummary } from '@aws-sdk/client-cloudformation';
import { AppSyncClient, ListGraphqlApisCommand, DeleteGraphqlApiCommand, GraphqlApi } from '@aws-sdk/client-appsync';
import { STSClient, GetCallerIdentityCommand, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const E2E_PROFILE_NAME = 'AmplifyAPIE2ETest';
const STALE_HOURS = 6;
const STALE_MS = STALE_HOURS * 60 * 60 * 1000;
const staleHorizon = new Date(Date.now() - STALE_MS);

const regionsFile = path.join(__dirname, 'e2e-test-regions.json');
const TEST_REGIONS: string[] = JSON.parse(fs.readFileSync(regionsFile, 'utf-8')).map((r: { name: string }) => r.name);

// Patterns that identify test-created resources — each has a name for reporting
type FilterRule = { name: string; pattern: RegExp; source: string };

const IAM_POLICY_RULES: FilterRule[] = [
  {
    name: 'amplify-* (CFN-generated)',
    pattern: /^amplify-/,
    source: 'AuthRolePolicy/UnauthRolePolicy created by @aws-amplify/graphql-auth-transformer via CFN nested stacks during amplify push',
  },
  {
    name: 'auth-exhaustive test',
    pattern: /^auth-exhaustive/,
    source: 'AuthRolePolicy/UnauthRolePolicy from graphql-transformers-e2e-tests AuthV2Exhaustive*.test.ts test suites',
  },
  {
    name: 'MultiAuth test',
    pattern: /^MultiAuth/,
    source: 'Policies from graphql-transformers-e2e-tests MultiAuthV2Transformer.e2e.test.ts',
  },
  {
    name: 'SearchableAuth test',
    pattern: /^SearchableAuth/,
    source: 'Policies from graphql-transformers-e2e-tests SearchableWithAuthV2.e2e.test.ts',
  },
  {
    name: 'SubscriptionAuth test',
    pattern: /^SubscriptionAuth/,
    source: 'Policies from graphql-transformers-e2e-tests SubscriptionsWithAuthV2.e2e.test.ts',
  },
  {
    name: 'NonModelAuth test',
    pattern: /^NonModelAuth/,
    source: 'Policies from graphql-transformers-e2e-tests NonModelAuthV2Function.e2e.test.ts',
  },
  {
    name: 'FunctionTransformer test',
    pattern: /^FunctionTransformer/,
    source: 'Policies from graphql-transformers-e2e-tests FunctionTransformerTestsV2.e2e.test.ts',
  },
  {
    name: 'MutationCondition test',
    pattern: /^MutationCondition/,
    source: 'Policies from graphql-transformers-e2e-tests MutationConditionTest',
  },
  {
    name: 'JsonMockStack test',
    pattern: /^JsonMockStack/,
    source: 'Policies from amplify-graphql-api-construct-tests json-*.test.ts CDK construct tests',
  },
  {
    name: 'SubscriptionRTF test',
    pattern: /^SubscriptionRTF/,
    source: 'Policies from graphql-transformers-e2e-tests SubscriptionsRuntimeFiltering.e2e.test.ts',
  },
  {
    name: 'cdkamplifytable test',
    pattern: /^cdkamplifytable/,
    source: 'Policies from amplify-graphql-api-construct-tests amplify-table-*.test.ts CDK construct tests',
  },
  {
    name: 'HttpTransformer test',
    pattern: /^HttpTransformer/,
    source: 'Policies from graphql-transformers-e2e-tests HttpTransformerV2.e2e.test.ts',
  },
  {
    name: '*-integtest (integration test)',
    pattern: /-integtest/,
    source: 'Ephemeral policies created by any e2e test using the -integtest naming convention (rds-schema-inspector, amplify push, etc.)',
  },
];

const IAM_ROLE_RULES: FilterRule[] = [
  {
    name: 'amplify-* (CFN-generated)',
    pattern: /^amplify-/,
    source: 'authRole/unauthRole created by amplify init/push via CFN root stacks; also Lambda execution roles from nested stacks',
  },
  {
    name: 'region-prefixed role',
    pattern: /^eu-|^us-|^ap-/,
    source: 'Cognito AdminGroupRole created by auth tests (e.g., schema-auth-*.test.ts) — named after the Cognito User Pool region prefix',
  },
  {
    name: 'auth-exhaustive test',
    pattern: /^auth-exhaustive-tests/,
    source: 'authRole/unauthRole from graphql-transformers-e2e-tests AuthV2Exhaustive*.test.ts',
  },
  {
    name: 'rds-schema-inspector',
    pattern: /rds-schema-inspector-integtest/,
    source: 'Lambda execution role created by amplify-graphql-schema-generator for RDS introspection during amplify api generate-schema',
  },
  {
    name: 'amplify_e2e_tests_lambda',
    pattern: /^amplify_e2e_tests_lambda/,
    source: 'Lambda execution roles created by amplify-e2e-tests function tests',
  },
  {
    name: 'JsonMockStack test',
    pattern: /^JsonMockStack-jsonMockApi/,
    source: 'AppSync CloudWatch role from amplify-graphql-api-construct-tests json-*.test.ts',
  },
  {
    name: 'SubscriptionAuth test',
    pattern: /^SubscriptionAuth/,
    source: 'Roles from graphql-transformers-e2e-tests SubscriptionsWithAuthV2.e2e.test.ts',
  },
  {
    name: 'cdkamplifytable test',
    pattern: /^cdkamplifytable[0-9]*-/,
    source: 'CDK-generated roles from amplify-graphql-api-construct-tests amplify-table-*.test.ts',
  },
  {
    name: 'MutationCondition test',
    pattern: /^MutationConditionTest-/,
    source: 'Roles from graphql-transformers-e2e-tests MutationConditionTest',
  },
  {
    name: 'SearchableAuth test',
    pattern: /^SearchableAuth/,
    source: 'Roles from graphql-transformers-e2e-tests SearchableWithAuthV2.e2e.test.ts',
  },
  {
    name: 'SubscriptionRTF test',
    pattern: /^SubscriptionRTFTests-/,
    source: 'Roles from graphql-transformers-e2e-tests SubscriptionsRuntimeFiltering.e2e.test.ts',
  },
  {
    name: 'NonModelAuth test',
    pattern: /^NonModelAuthV2FunctionTransformerTests-/,
    source: 'Roles from graphql-transformers-e2e-tests NonModelAuthV2Function.e2e.test.ts',
  },
  {
    name: 'MultiAuth test',
    pattern: /^MultiAuthV2Transformer/,
    source: 'Roles from graphql-transformers-e2e-tests MultiAuthV2Transformer.e2e.test.ts',
  },
  {
    name: 'FunctionTransformer test',
    pattern: /^FunctionTransformerTests/,
    source: 'Roles from graphql-transformers-e2e-tests FunctionTransformerTestsV2.e2e.test.ts',
  },
  {
    name: '*-integtest (integration test)',
    pattern: /-integtest-|-integtest$/,
    source: 'Ephemeral roles created by any e2e test using the -integtest naming convention',
  },
];

const STACK_RULES: FilterRule[] = [
  {
    name: 'amplify-* (CFN-generated)',
    pattern: /^amplify-/,
    source: 'Root and nested CFN stacks created by amplify push during any e2e test',
  },
  {
    name: 'auth-exhaustive test',
    pattern: /^auth-exhaustive/,
    source: 'Stacks from graphql-transformers-e2e-tests AuthV2Exhaustive*.test.ts — deployed directly via CFN, not amplify push',
  },
  {
    name: 'MultiAuth test',
    pattern: /^MultiAuth/,
    source: 'Stacks from graphql-transformers-e2e-tests MultiAuthV2Transformer.e2e.test.ts',
  },
  {
    name: 'SearchableAuth test',
    pattern: /^SearchableAuth/,
    source: 'Stacks from graphql-transformers-e2e-tests SearchableWithAuthV2.e2e.test.ts',
  },
  {
    name: 'SubscriptionAuth test',
    pattern: /^SubscriptionAuth/,
    source: 'Stacks from graphql-transformers-e2e-tests SubscriptionsWithAuthV2.e2e.test.ts',
  },
  {
    name: 'NonModelAuth test',
    pattern: /^NonModelAuth/,
    source: 'Stacks from graphql-transformers-e2e-tests NonModelAuthV2Function.e2e.test.ts',
  },
  {
    name: 'FunctionTransformer test',
    pattern: /^FunctionTransformer/,
    source: 'Stacks from graphql-transformers-e2e-tests FunctionTransformerTestsV2.e2e.test.ts',
  },
  {
    name: 'MutationCondition test',
    pattern: /^MutationCondition/,
    source: 'Stacks from graphql-transformers-e2e-tests MutationConditionTest',
  },
  { name: 'JsonMockStack test', pattern: /^JsonMockStack/, source: 'CDK stacks from amplify-graphql-api-construct-tests json-*.test.ts' },
  {
    name: 'SubscriptionRTF test',
    pattern: /^SubscriptionRTF/,
    source: 'Stacks from graphql-transformers-e2e-tests SubscriptionsRuntimeFiltering.e2e.test.ts',
  },
  {
    name: 'cdkamplifytable test',
    pattern: /^cdkamplifytable/,
    source: 'CDK stacks from amplify-graphql-api-construct-tests amplify-table-*.test.ts',
  },
  {
    name: 'HttpTransformer test',
    pattern: /^HttpTransformer/,
    source: 'Stacks from graphql-transformers-e2e-tests HttpTransformerV2.e2e.test.ts',
  },
];

const APPSYNC_RULES: FilterRule[] = [
  ...STACK_RULES,
  {
    name: '*-integtest (integration test)',
    pattern: /-integtest/,
    source: 'AppSync APIs created by any e2e test using the -integtest naming convention',
  },
];

function matchesAnyRule(name: string, rules: FilterRule[]): FilterRule | undefined {
  return rules.find((r) => r.pattern.test(name));
}

// Legacy combined regexes (kept for backward compat in case anything references them)
const TEST_IAM_POLICY_REGEX =
  /^amplify-|^auth-exhaustive|^MultiAuth|^SearchableAuth|^SubscriptionAuth|^NonModelAuth|^FunctionTransformer|^MutationCondition|^JsonMockStack|^SubscriptionRTF|^cdkamplifytable|^HttpTransformer|-integtest/;
const TEST_IAM_ROLE_REGEX =
  /!RotateE2eAwsToken-e2eTestContextRole|-integtest$|^amplify-|^eu-|^us-|^ap-|^auth-exhaustive-tests|rds-schema-inspector-integtest|^amplify_e2e_tests_lambda|^JsonMockStack-jsonMockApi|^SubscriptionAuth|^cdkamplifytable[0-9]*-|^MutationConditionTest-|^SearchableAuth|^SubscriptionRTFTests-|^NonModelAuthV2FunctionTransformerTests-|^MultiAuthV2Transformer|^FunctionTransformerTests|-integtest-/;
const TEST_STACK_REGEX =
  /^amplify-|^auth-exhaustive|^MultiAuth|^SearchableAuth|^SubscriptionAuth|^NonModelAuth|^FunctionTransformer|^MutationCondition|^JsonMockStack|^SubscriptionRTF|^cdkamplifytable|^HttpTransformer/;
const TEST_APPSYNC_REGEX =
  /^amplify-|^auth-exhaustive|^MultiAuth|^SearchableAuth|^SubscriptionAuth|^NonModelAuth|^FunctionTransformer|^MutationCondition|^JsonMockStack|^SubscriptionRTF|^cdkamplifytable|^HttpTransformer|-integtest/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Credentials = { accessKeyId: string; secretAccessKey: string; sessionToken: string };

type AccountInfo = {
  accountId: string;
  credentials: Credentials;
};

type ResourceSummary = {
  type: string;
  id: string;
  name: string;
  region: string;
  age: string;
  matchedRule: string;
  excludeReason?: string;
  createdAt?: Date;
};

type AccountReport = {
  accountId: string;
  resources: ResourceSummary[];
  excluded: ResourceSummary[];
  counts: Record<string, number>;
  excludedCounts: Record<string, number>;
  errors: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ageString = (date: Date): string => {
  const ms = Date.now() - date.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
};

const isStale = (date: Date | undefined): boolean => {
  if (!date) return false;
  return date.getTime() < staleHorizon.getTime();
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryThrottles<T>(fn: () => Promise<T>, maxAttempts = 10): Promise<T> {
  let delay = 200;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt < maxAttempts && ['Throttling', 'TooManyRequestsException', 'ThrottlingException'].includes(e.name)) {
        await sleep(Math.floor(Math.random() * delay));
        delay *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new Error('unreachable');
}

async function paginateAll<T>(fetcher: (token?: string) => Promise<{ nextToken?: string; items: T[] }>): Promise<T[]> {
  const results: T[] = [];
  let token: string | undefined;
  do {
    const page = await retryThrottles(() => fetcher(token));
    results.push(...page.items);
    token = page.nextToken;
  } while (token);
  return results;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

async function discoverIamPolicies(
  creds: Credentials,
): Promise<{ resources: ResourceSummary[]; excluded: ResourceSummary[]; errors: string[] }> {
  const iam = new IAMClient({ credentials: creds, region: 'us-east-1' });
  const errors: string[] = [];
  try {
    const policies = await paginateAll<Policy>(async (token) => {
      const resp = await iam.send(new ListPoliciesCommand({ Scope: 'Local', Marker: token, MaxItems: 100 }));
      return { nextToken: resp.IsTruncated ? resp.Marker : undefined, items: resp.Policies ?? [] };
    });
    const results: ResourceSummary[] = [];
    const excluded: ResourceSummary[] = [];
    for (const p of policies) {
      const rule = matchesAnyRule(p.PolicyName ?? '', IAM_POLICY_RULES);
      if (!rule) continue; // doesn't match any test pattern — not ours, skip silently
      const base = {
        type: 'IAM Policy',
        id: p.Arn!,
        name: p.PolicyName!,
        region: 'global',
        age: p.CreateDate ? ageString(p.CreateDate) : 'unknown',
        matchedRule: rule.name,
        createdAt: p.CreateDate,
      };
      if (!isStale(p.CreateDate)) {
        excluded.push({ ...base, excludeReason: `Too recent (< ${STALE_HOURS}h old) — may be from an active e2e run` });
      } else if (p.AttachmentCount && p.AttachmentCount > 0) {
        excluded.push({ ...base, excludeReason: `Still attached to ${p.AttachmentCount} resource(s)` });
      } else {
        results.push(base);
      }
    }
    return { resources: results, excluded, errors };
  } catch (e: any) {
    errors.push(`IAM Policies: ${e.message}`);
    return { resources: [], excluded: [], errors };
  }
}

async function discoverIamRoles(
  creds: Credentials,
): Promise<{ resources: ResourceSummary[]; excluded: ResourceSummary[]; errors: string[] }> {
  const iam = new IAMClient({ credentials: creds, region: 'us-east-1' });
  const errors: string[] = [];
  try {
    const roles = await paginateAll<Role>(async (token) => {
      const resp = await iam.send(new ListRolesCommand({ Marker: token, MaxItems: 100 }));
      return { nextToken: resp.IsTruncated ? resp.Marker : undefined, items: resp.Roles ?? [] };
    });
    const results: ResourceSummary[] = [];
    const excluded: ResourceSummary[] = [];
    for (const r of roles) {
      const rule = matchesAnyRule(r.RoleName ?? '', IAM_ROLE_RULES);
      if (!rule) continue;
      const base = {
        type: 'IAM Role',
        id: r.Arn!,
        name: r.RoleName!,
        region: 'global',
        age: r.CreateDate ? ageString(r.CreateDate) : 'unknown',
        matchedRule: rule.name,
        createdAt: r.CreateDate,
      };
      if (!isStale(r.CreateDate)) {
        excluded.push({ ...base, excludeReason: `Too recent (< ${STALE_HOURS}h old) — may be from an active e2e run` });
      } else {
        results.push(base);
      }
    }
    return { resources: results, excluded, errors };
  } catch (e: any) {
    errors.push(`IAM Roles: ${e.message}`);
    return { resources: [], excluded: [], errors };
  }
}

async function discoverStacks(
  creds: Credentials,
  region: string,
): Promise<{ resources: ResourceSummary[]; excluded: ResourceSummary[]; errors: string[] }> {
  const cfn = new CloudFormationClient({ credentials: creds, region });
  const errors: string[] = [];
  try {
    const deleteStatuses: StackStatus[] = [
      StackStatus.CREATE_COMPLETE,
      StackStatus.CREATE_FAILED,
      StackStatus.DELETE_FAILED,
      StackStatus.ROLLBACK_COMPLETE,
      StackStatus.ROLLBACK_FAILED,
      StackStatus.UPDATE_COMPLETE,
      StackStatus.UPDATE_ROLLBACK_COMPLETE,
      StackStatus.UPDATE_ROLLBACK_FAILED,
    ];
    const stacks = await paginateAll<StackSummary>(async (token) => {
      const resp = await cfn.send(new ListStacksCommand({ NextToken: token, StackStatusFilter: deleteStatuses }));
      return { nextToken: resp.NextToken, items: resp.StackSummaries ?? [] };
    });
    const results: ResourceSummary[] = [];
    const excluded: ResourceSummary[] = [];
    for (const s of stacks) {
      const rule = matchesAnyRule(s.StackName ?? '', STACK_RULES);
      if (!rule) continue;
      const base = {
        type: 'CFN Stack',
        id: s.StackId!,
        name: s.StackName!,
        region,
        age: s.CreationTime ? ageString(s.CreationTime) : 'unknown',
        matchedRule: rule.name,
        createdAt: s.CreationTime,
      };
      if (!isStale(s.CreationTime)) {
        excluded.push({ ...base, excludeReason: `Too recent (< ${STALE_HOURS}h old) — may be from an active e2e run` });
      } else {
        results.push(base);
      }
    }
    return { resources: results, excluded, errors };
  } catch (e: any) {
    if (e.name === 'InvalidClientTokenId') return { resources: [], excluded: [], errors: [] };
    errors.push(`CFN Stacks (${region}): ${e.message}`);
    return { resources: [], excluded: [], errors };
  }
}

async function discoverAppSyncApis(
  creds: Credentials,
  region: string,
): Promise<{ resources: ResourceSummary[]; excluded: ResourceSummary[]; errors: string[] }> {
  const client = new AppSyncClient({ credentials: creds, region });
  const errors: string[] = [];
  try {
    const apis = await paginateAll<GraphqlApi>(async (token) => {
      const resp = await client.send(new ListGraphqlApisCommand({ nextToken: token, maxResults: 25 }));
      return { nextToken: resp.nextToken, items: resp.graphqlApis ?? [] };
    });
    const results: ResourceSummary[] = [];
    const excluded: ResourceSummary[] = [];
    for (const a of apis) {
      const rule = matchesAnyRule(a.name ?? '', APPSYNC_RULES);
      if (!rule) continue;
      // AppSync APIs don't expose creation time in list, so no staleness exclusion possible
      results.push({
        type: 'AppSync API',
        id: a.apiId!,
        name: a.name!,
        region,
        age: 'unknown',
        matchedRule: rule.name,
      });
    }
    return { resources: results, excluded, errors };
  } catch (e: any) {
    if (['InvalidClientTokenId', 'UnrecognizedClientException'].includes(e.name)) return { resources: [], excluded: [], errors: [] };
    errors.push(`AppSync APIs (${region}): ${e.message}`);
    return { resources: [], excluded: [], errors };
  }
}

// ---------------------------------------------------------------------------
// Unified discovery for a single account
// ---------------------------------------------------------------------------

export async function discoverAccountResources(account: AccountInfo): Promise<AccountReport> {
  const allResources: ResourceSummary[] = [];
  const allExcluded: ResourceSummary[] = [];
  const allErrors: string[] = [];

  console.log(`  [${account.accountId}] Discovering IAM policies and roles...`);
  const [policies, roles] = await Promise.all([discoverIamPolicies(account.credentials), discoverIamRoles(account.credentials)]);
  allResources.push(...policies.resources, ...roles.resources);
  allExcluded.push(...policies.excluded, ...roles.excluded);
  allErrors.push(...policies.errors, ...roles.errors);

  console.log(`  [${account.accountId}] Discovering regional resources across ${TEST_REGIONS.length} regions...`);
  for (let i = 0; i < TEST_REGIONS.length; i += 5) {
    const batch = TEST_REGIONS.slice(i, i + 5);
    const results = await Promise.all(
      batch.flatMap((region) => [discoverStacks(account.credentials, region), discoverAppSyncApis(account.credentials, region)]),
    );
    for (const r of results) {
      allResources.push(...r.resources);
      allExcluded.push(...r.excluded);
      allErrors.push(...r.errors);
    }
  }

  const counts: Record<string, number> = {};
  for (const r of allResources) counts[r.type] = (counts[r.type] || 0) + 1;
  const excludedCounts: Record<string, number> = {};
  for (const r of allExcluded) excludedCounts[r.type] = (excludedCounts[r.type] || 0) + 1;

  return { accountId: account.accountId, resources: allResources, excluded: allExcluded, counts, excludedCounts, errors: allErrors };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function deleteIamPolicy(iam: IAMClient, policyArn: string): Promise<void> {
  const versions = await retryThrottles(() => iam.send(new ListPolicyVersionsCommand({ PolicyArn: policyArn })));
  for (const v of versions.Versions ?? []) {
    if (!v.IsDefaultVersion) {
      await retryThrottles(() => iam.send(new DeletePolicyVersionCommand({ PolicyArn: policyArn, VersionId: v.VersionId })));
    }
  }
  await retryThrottles(() => iam.send(new DeletePolicyCommand({ PolicyArn: policyArn })));
}

async function deleteIamRole(iam: IAMClient, roleName: string): Promise<void> {
  const attached = await retryThrottles(() => iam.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName })));
  for (const p of attached.AttachedPolicies ?? []) {
    await retryThrottles(() => iam.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: p.PolicyArn })));
  }
  const inline = await retryThrottles(() => iam.send(new ListRolePoliciesCommand({ RoleName: roleName })));
  for (const pName of inline.PolicyNames ?? []) {
    await retryThrottles(() => iam.send(new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: pName })));
  }
  const profiles = await retryThrottles(() => iam.send(new ListInstanceProfilesForRoleCommand({ RoleName: roleName })));
  for (const ip of profiles.InstanceProfiles ?? []) {
    await retryThrottles(() =>
      iam.send(new RemoveRoleFromInstanceProfileCommand({ RoleName: roleName, InstanceProfileName: ip.InstanceProfileName })),
    );
    try {
      await retryThrottles(() => iam.send(new DeleteInstanceProfileCommand({ InstanceProfileName: ip.InstanceProfileName })));
    } catch {
      /* ignore */
    }
  }
  await retryThrottles(() => iam.send(new DeleteRoleCommand({ RoleName: roleName })));
}

export async function cleanupResources(account: AccountInfo, resources: ResourceSummary[], dryRun: boolean): Promise<void> {
  if (resources.length === 0) {
    console.log(`  [${account.accountId}] Nothing to clean up.`);
    return;
  }
  if (dryRun) {
    console.log(`  [${account.accountId}] DRY RUN — would delete ${resources.length} resources.`);
    return;
  }

  const creds = account.credentials;
  const iam = new IAMClient({ credentials: creds, region: 'us-east-1' });

  // Stacks first
  for (const stack of resources.filter((r) => r.type === 'CFN Stack')) {
    try {
      const cfn = new CloudFormationClient({ credentials: creds, region: stack.region });
      console.log(`  [${account.accountId}] Deleting CFN Stack: ${stack.name} (${stack.region})`);
      await retryThrottles(() => cfn.send(new DeleteStackCommand({ StackName: stack.name })));
    } catch (e: any) {
      console.log(`  [${account.accountId}] Failed to delete stack ${stack.name}: ${e.message}`);
    }
  }

  // IAM policies
  const policies = resources.filter((r) => r.type === 'IAM Policy');
  let pDel = 0;
  for (const p of policies) {
    try {
      await deleteIamPolicy(iam, p.id);
      pDel++;
      if (pDel % 100 === 0) console.log(`  [${account.accountId}] Deleted ${pDel}/${policies.length} IAM policies...`);
    } catch (e: any) {
      console.log(`  [${account.accountId}] Failed to delete policy ${p.name}: ${e.message}`);
    }
  }
  if (policies.length > 0) console.log(`  [${account.accountId}] Deleted ${pDel}/${policies.length} IAM policies.`);

  // IAM roles
  const roles = resources.filter((r) => r.type === 'IAM Role');
  let rDel = 0;
  for (const r of roles) {
    try {
      await deleteIamRole(iam, r.name);
      rDel++;
    } catch (e: any) {
      console.log(`  [${account.accountId}] Failed to delete role ${r.name}: ${e.message}`);
    }
  }
  if (roles.length > 0) console.log(`  [${account.accountId}] Deleted ${rDel}/${roles.length} IAM roles.`);

  // AppSync APIs
  for (const api of resources.filter((r) => r.type === 'AppSync API')) {
    try {
      const client = new AppSyncClient({ credentials: creds, region: api.region });
      console.log(`  [${account.accountId}] Deleting AppSync API: ${api.name} (${api.region})`);
      await retryThrottles(() => client.send(new DeleteGraphqlApiCommand({ apiId: api.id })));
    } catch (e: any) {
      console.log(`  [${account.accountId}] Failed to delete AppSync API ${api.name}: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Account resolution — uses STS directly to avoid broken credential-providers
// ---------------------------------------------------------------------------

async function assumeRole(parentCreds: Credentials, roleArn: string, sessionName: string): Promise<Credentials> {
  const sts = new STSClient({ credentials: parentCreds, region: 'us-east-1' });
  const resp = await sts.send(new AssumeRoleCommand({ RoleArn: roleArn, RoleSessionName: sessionName, DurationSeconds: 3600 }));
  return {
    accessKeyId: resp.Credentials!.AccessKeyId!,
    secretAccessKey: resp.Credentials!.SecretAccessKey!,
    sessionToken: resp.Credentials!.SessionToken!,
  };
}

async function getParentCredentials(): Promise<Credentials> {
  if (process.env.TEST_ACCOUNT_ROLE) {
    // CI — assume the test account role using default credentials
    const sts = new STSClient({ region: 'us-east-1' });
    const resp = await sts.send(
      new AssumeRoleCommand({
        RoleArn: process.env.TEST_ACCOUNT_ROLE,
        RoleSessionName: `resourceMgr${Date.now()}`,
        DurationSeconds: 3600,
      }),
    );
    return {
      accessKeyId: resp.Credentials!.AccessKeyId!,
      secretAccessKey: resp.Credentials!.SecretAccessKey!,
      sessionToken: resp.Credentials!.SessionToken!,
    };
  }
  // Local — use profile, resolve to static creds via STS
  const profileCreds = fromIni({ profile: E2E_PROFILE_NAME });
  const resolved = await profileCreds();
  return {
    accessKeyId: resolved.accessKeyId,
    secretAccessKey: resolved.secretAccessKey,
    sessionToken: (resolved as any).sessionToken ?? '',
  };
}

function listOrgAccountIds(parentCreds: Credentials): string[] {
  // Use AWS CLI to list org accounts since @aws-sdk/client-organizations has smithy issues
  try {
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: parentCreds.accessKeyId,
      AWS_SECRET_ACCESS_KEY: parentCreds.secretAccessKey,
      AWS_SESSION_TOKEN: parentCreds.sessionToken,
      AWS_DEFAULT_REGION: 'us-east-1',
    };
    const output = execSync('aws organizations list-accounts --query "Accounts[].Id" --output json', {
      env,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return JSON.parse(output);
  } catch (e: any) {
    console.log(`Could not list org accounts via CLI: ${e.message}`);
    return [];
  }
}

async function resolveAccounts(parentCreds: Credentials, targetAccountId?: string): Promise<AccountInfo[]> {
  const sts = new STSClient({ credentials: parentCreds, region: 'us-east-1' });
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  const parentAccountId = identity.Account!;

  const accountIds = listOrgAccountIds(parentCreds);
  if (accountIds.length === 0) {
    console.log('Falling back to parent account only.');
    return [{ accountId: parentAccountId, credentials: parentCreds }];
  }

  if (targetAccountId) {
    if (!accountIds.includes(targetAccountId)) {
      throw new Error(`Account ${targetAccountId} not found in organization. Available: ${accountIds.join(', ')}`);
    }
    if (targetAccountId === parentAccountId) {
      return [{ accountId: parentAccountId, credentials: parentCreds }];
    }
    const creds = await assumeRole(
      parentCreds,
      `arn:aws:iam::${targetAccountId}:role/OrganizationAccountAccessRole`,
      `resourceMgr${Date.now()}`,
    );
    return [{ accountId: targetAccountId, credentials: creds }];
  }

  // All accounts
  const accounts: AccountInfo[] = [];
  for (const id of accountIds) {
    if (id === parentAccountId) {
      accounts.push({ accountId: id, credentials: parentCreds });
    } else {
      try {
        const creds = await assumeRole(parentCreds, `arn:aws:iam::${id}:role/OrganizationAccountAccessRole`, `resourceMgr${Date.now()}`);
        accounts.push({ accountId: id, credentials: creds });
      } catch (e: any) {
        console.log(`  Skipping account ${id}: ${e.message}`);
      }
    }
  }
  return accounts;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(report: AccountReport): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Account: ${report.accountId}`);
  console.log(`${'='.repeat(70)}`);

  if (report.errors.length > 0) {
    console.log(`\n⚠️  Errors during discovery:`);
    for (const err of report.errors) console.log(`  - ${err}`);
  }

  if (report.resources.length === 0) {
    console.log(`\n✅ No stale test resources found.`);
    return;
  }

  console.log(`\n🔎 Filter criteria:`);
  console.log(`  Staleness: resources older than ${STALE_HOURS} hours (before ${staleHorizon.toISOString()})`);
  console.log(`  Name patterns: matched against known test resource naming conventions`);

  console.log(`\n📊 Summary by resource type:`);
  for (const [type, count] of Object.entries(report.counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(`  TOTAL: ${report.resources.length}`);

  // Excluded resources
  if (report.excluded.length > 0) {
    console.log(`\n🛡️  Excluded (matched name pattern but protected):`);
    for (const [type, count] of Object.entries(report.excludedCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    console.log(`  TOTAL EXCLUDED: ${report.excluded.length}`);

    // Group by exclusion reason
    const byReason: Record<string, ResourceSummary[]> = {};
    for (const r of report.excluded) (byReason[r.excludeReason!] ??= []).push(r);
    for (const [reason, items] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n  ⏭️  "${reason}" (${items.length}):`);
      const show = items.slice(0, 3);
      for (const r of show) console.log(`     ${r.type}: ${r.name} | age: ${r.age}`);
      if (items.length > 3) console.log(`     ... and ${items.length - 3} more`);
    }
  }

  const byType: Record<string, ResourceSummary[]> = {};
  for (const r of report.resources) (byType[r.type] ??= []).push(r);

  for (const [type, items] of Object.entries(byType)) {
    console.log(`\n--- ${type} (${items.length}) ---`);
    const byRule: Record<string, ResourceSummary[]> = {};
    for (const r of items) (byRule[r.matchedRule] ??= []).push(r);

    for (const [rule, ruleItems] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
      // Find the source from the correct rule set for this resource type
      const type = ruleItems[0].type;
      const ruleSet =
        type === 'IAM Policy'
          ? IAM_POLICY_RULES
          : type === 'IAM Role'
          ? IAM_ROLE_RULES
          : type === 'CFN Stack'
          ? STACK_RULES
          : APPSYNC_RULES;
      const ruleObj = ruleSet.find((r) => r.name === rule);
      console.log(`\n  📌 "${rule}" (${ruleItems.length}):`);
      if (ruleObj) console.log(`     Source: ${ruleObj.source}`);
      const show = ruleItems.slice(0, 5);
      for (const r of show) console.log(`     ${r.name} | ${r.region} | age: ${r.age}`);
      if (ruleItems.length > 5) console.log(`     ... and ${ruleItems.length - 5} more`);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (!command || !['discover', 'cleanup'].includes(command)) {
    console.log('Usage:');
    console.log('  yarn ts-node scripts/e2e-resource-manager.ts discover [accountId]');
    console.log('  yarn ts-node scripts/e2e-resource-manager.ts cleanup [accountId] [--dry-run]');
    process.exit(1);
  }

  const dryRun = rest.includes('--dry-run');
  const accountId = rest.find((r) => !r.startsWith('--'));

  console.log(`🔍 Resolving credentials...`);
  const parentCreds = await getParentCredentials();

  console.log(`📋 Resolving accounts${accountId ? ` (filtered to ${accountId})` : ''}...`);
  const accounts = await resolveAccounts(parentCreds, accountId);
  console.log(`Processing ${accounts.length} account(s)\n`);

  const allReports: AccountReport[] = [];
  for (let i = 0; i < accounts.length; i += 2) {
    const batch = accounts.slice(i, i + 2);
    const reports = await Promise.all(batch.map((acct) => discoverAccountResources(acct)));
    allReports.push(...reports);
  }

  for (const report of allReports) printReport(report);

  const grandTotal = allReports.reduce((sum, r) => sum + r.resources.length, 0);
  if (allReports.length > 1) {
    const grandCounts: Record<string, number> = {};
    for (const r of allReports) for (const [type, count] of Object.entries(r.counts)) grandCounts[type] = (grandCounts[type] || 0) + count;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`GRAND TOTAL across ${allReports.length} accounts: ${grandTotal} resources`);
    for (const [type, count] of Object.entries(grandCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${type}: ${count}`);
  }

  if (command === 'cleanup') {
    console.log(`\n🧹 Cleanup mode${dryRun ? ' (DRY RUN)' : ''}...`);
    for (const report of allReports) {
      const account = accounts.find((a) => a.accountId === report.accountId)!;
      await cleanupResources(account, report.resources, dryRun);
    }
    console.log(`\n✅ Cleanup complete.`);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
