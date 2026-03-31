/**
 * Reproduction script for the vpc-helper IAM cleanup bug.
 *
 * Bug: `deleteSchemaInspectorLambdaRole()` in vpc-helper.ts only deletes the
 * Lambda function but never cleans up the IAM execution role or its managed
 * policy. Over time, orphaned policies accumulate and hit the per-account
 * 3,000-policy quota.
 *
 * This script:
 *   1. Creates an IAM role + policy using the SAME naming patterns as
 *      `createRole()` / `createPolicy()` in vpc-helper.ts.
 *   2. Proves the OLD cleanup code leaves resources behind (BUG).
 *   3. Runs the FIXED cleanup logic and proves resources are removed (FIX).
 *   4. Always cleans up after itself in a `finally` block.
 *
 * Usage:
 *   AWS_PROFILE=roko npx ts-node scripts/reproduce-vpc-helper-bug.ts
 *
 *   # or with --profile flag:
 *   npx ts-node scripts/reproduce-vpc-helper-bug.ts --profile roko
 */

import {
  IAMClient,
  CreateRoleCommand,
  CreatePolicyCommand,
  AttachRolePolicyCommand,
  GetRoleCommand,
  GetPolicyCommand,
  DeleteRoleCommand,
  DeletePolicyCommand,
  DetachRolePolicyCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand,
  DeleteRolePolicyCommand,
  waitUntilPolicyExists,
  waitUntilRoleExists,
} from '@aws-sdk/client-iam';
import { fromIni } from '@aws-sdk/credential-providers';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION ?? 'us-east-1';

function getProfile(): string | undefined {
  const idx = process.argv.indexOf('--profile');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return process.env.AWS_PROFILE ?? undefined;
}

function makeIamClient(): IAMClient {
  const profile = getProfile();
  const opts: Record<string, unknown> = { region: REGION };
  if (profile) {
    opts.credentials = fromIni({ profile });
  }
  return new IAMClient(opts);
}

function makeStsClient(): STSClient {
  const profile = getProfile();
  const opts: Record<string, unknown> = { region: REGION };
  if (profile) {
    opts.credentials = fromIni({ profile });
  }
  return new STSClient(opts);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Color helpers (basic ANSI)
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(msg: string) { console.log(`  ${GREEN}✓ PASS${RESET} ${msg}`); }
function fail(msg: string) { console.log(`  ${RED}✗ FAIL${RESET} ${msg}`); }
function info(msg: string) { console.log(`  ${CYAN}ℹ${RESET} ${msg}`); }
function warn(msg: string) { console.log(`  ${YELLOW}⚠${RESET} ${msg}`); }
function heading(msg: string) { console.log(`\n${BOLD}${msg}${RESET}`); }

// ---------------------------------------------------------------------------
// IAM resource helpers — mirrors vpc-helper.ts patterns exactly
// ---------------------------------------------------------------------------

/**
 * Matches the policy document created by `createPolicy()` in vpc-helper.ts.
 */
function getLambdaPolicyDocument(): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Resource: '*',
        Action: [
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DeleteNetworkInterface',
        ],
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: ['arn:aws:logs:*:*:*'],
      },
    ],
  });
}

function getAssumeRolePolicyDocument(): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  });
}

/**
 * Creates role + policy using the exact same naming convention as vpc-helper.ts:
 *   roleName  = `${lambdaName}-execution-role`
 *   policyName = `${roleName}-policy`
 */
async function createRoleAndPolicy(
  iamClient: IAMClient,
  lambdaName: string,
): Promise<{ roleName: string; policyArn: string }> {
  const roleName = `${lambdaName}-execution-role`;
  const policyName = `${roleName}-policy`;

  // Create the managed policy
  const policyRes = await iamClient.send(
    new CreatePolicyCommand({
      PolicyName: policyName,
      PolicyDocument: getLambdaPolicyDocument(),
    }),
  );
  const policyArn = policyRes.Policy!.Arn!;
  await waitUntilPolicyExists({ client: iamClient, maxWaitTime: 30 }, { PolicyArn: policyArn });
  info(`Created policy: ${policyName}  (${policyArn})`);

  // Create the role
  await iamClient.send(
    new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: getAssumeRolePolicyDocument(),
    }),
  );
  await waitUntilRoleExists({ client: iamClient, maxWaitTime: 30 }, { RoleName: roleName });
  info(`Created role:   ${roleName}`);

  // Attach the policy to the role
  await iamClient.send(
    new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: policyArn,
    }),
  );
  info(`Attached policy to role`);

  return { roleName, policyArn };
}

// ---------------------------------------------------------------------------
// Existence checks
// ---------------------------------------------------------------------------

async function roleExists(iamClient: IAMClient, roleName: string): Promise<boolean> {
  try {
    await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
    return true;
  } catch (err: any) {
    if (err.name === 'NoSuchEntityException') return false;
    throw err;
  }
}

async function policyExists(iamClient: IAMClient, policyArn: string): Promise<boolean> {
  try {
    await iamClient.send(new GetPolicyCommand({ PolicyArn: policyArn }));
    return true;
  } catch (err: any) {
    if (err.name === 'NoSuchEntityException') return false;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// OLD delete logic (buggy) — only deletes the Lambda, ignores IAM
// ---------------------------------------------------------------------------

/**
 * This is what the OLD code did:
 *
 *   const deleteSchemaInspectorLambdaRole = async (lambdaName, region) => {
 *     const lambdaClient = new LambdaClient({ region });
 *     await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: lambdaName }));
 *     await sleep(10000);
 *   };
 *
 * We skip the actual Lambda deletion (we didn't create one) to keep it simple.
 * The point is: the old code does NOTHING about the IAM role/policy.
 */
async function oldDeleteLogic(_lambdaName: string, _region: string): Promise<void> {
  // Old code only deleted the Lambda function — no IAM cleanup at all.
  // (No-op here because we didn't create a Lambda.)
}

// ---------------------------------------------------------------------------
// NEW delete logic (fixed) — mirrors the fix on fix/vpc-helper-cleanup
// ---------------------------------------------------------------------------

async function fixedDeleteLogic(iamClient: IAMClient, lambdaName: string): Promise<void> {
  const roleName = `${lambdaName}-execution-role`;

  // Step 1: Detach and delete managed policies from the role
  try {
    const listAttachedRes = await iamClient.send(
      new ListAttachedRolePoliciesCommand({ RoleName: roleName }),
    );
    for (const policy of listAttachedRes.AttachedPolicies ?? []) {
      try {
        await iamClient.send(
          new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }),
        );
      } catch (detachErr) {
        warn(`Failed to detach policy ${policy.PolicyArn}: ${detachErr}`);
      }
      try {
        await iamClient.send(new DeletePolicyCommand({ PolicyArn: policy.PolicyArn }));
      } catch (deletePolicyErr) {
        warn(`Failed to delete policy ${policy.PolicyArn}: ${deletePolicyErr}`);
      }
    }
  } catch (listErr) {
    warn(`Failed to list attached policies for role ${roleName}: ${listErr}`);
  }

  // Step 2: Delete inline policies from the role
  try {
    const listInlineRes = await iamClient.send(
      new ListRolePoliciesCommand({ RoleName: roleName }),
    );
    for (const policyName of listInlineRes.PolicyNames ?? []) {
      try {
        await iamClient.send(
          new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: policyName }),
        );
      } catch (deleteInlineErr) {
        warn(`Failed to delete inline policy ${policyName}: ${deleteInlineErr}`);
      }
    }
  } catch (listInlineErr) {
    warn(`Failed to list inline policies for role ${roleName}: ${listInlineErr}`);
  }

  // Step 3: Delete the IAM role
  try {
    await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }));
  } catch (deleteRoleErr) {
    warn(`Failed to delete role ${roleName}: ${deleteRoleErr}`);
  }

  // Step 4: Lambda deletion would go here (skipped — no Lambda created)
}

// ---------------------------------------------------------------------------
// Safety-net cleanup — runs in `finally`, idempotent
// ---------------------------------------------------------------------------

async function forceCleanup(
  iamClient: IAMClient,
  roleName: string,
  policyArn: string,
): Promise<void> {
  heading('🧹 Safety-net cleanup (ensuring no resources are leaked)');

  // Detach + delete ALL managed policies (list them to be fully robust)
  try {
    const listAttachedRes = await iamClient.send(
      new ListAttachedRolePoliciesCommand({ RoleName: roleName }),
    );
    for (const p of listAttachedRes.AttachedPolicies ?? []) {
      try {
        await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: p.PolicyArn }));
        info(`Detached policy ${p.PolicyArn}`);
      } catch (_) { /* already detached */ }
      try {
        await iamClient.send(new DeletePolicyCommand({ PolicyArn: p.PolicyArn }));
        info(`Deleted policy  ${p.PolicyArn}`);
      } catch (_) { /* already deleted */ }
    }
  } catch (_) {
    // Role may already be gone — try deleting the policy directly by ARN
    try {
      await iamClient.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
      info(`Deleted policy  ${policyArn}`);
    } catch (__) { /* already deleted */ }
  }

  // Delete inline policies
  try {
    const listInlineRes = await iamClient.send(new ListRolePoliciesCommand({ RoleName: roleName }));
    for (const pn of listInlineRes.PolicyNames ?? []) {
      await iamClient.send(new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: pn }));
    }
  } catch (_) { /* role gone or no inline policies */ }

  // Delete the role
  try {
    await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }));
    info(`Deleted role     ${roleName}`);
  } catch (_) { /* already deleted */ }

  info('Cleanup complete — no resources leaked.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const iamClient = makeIamClient();
  const stsClient = makeStsClient();

  // Resolve the account ID so we can construct policy ARNs
  const identity = await stsClient.send(new GetCallerIdentityCommand({}));
  const accountId = identity.Account!;
  info(`AWS Account: ${accountId}  Region: ${REGION}  Profile: ${getProfile() ?? '(default)'}`);

  // Unique name to avoid collisions
  const lambdaName = `repro-vpc-bug-${Date.now()}`;
  const roleName = `${lambdaName}-execution-role`;
  const policyName = `${roleName}-policy`;
  const policyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;

  heading('═══════════════════════════════════════════════════════');
  heading('  vpc-helper IAM cleanup bug — reproduction script');
  heading('═══════════════════════════════════════════════════════');

  try {
    // -----------------------------------------------------------------------
    // Phase 1: Create IAM resources (same as provisionSchemaInspectorLambda)
    // -----------------------------------------------------------------------
    heading('Phase 1 — Create IAM resources (mirrors vpc-helper createRole)');
    const created = await createRoleAndPolicy(iamClient, lambdaName);

    // Verify they exist
    const roleOk = await roleExists(iamClient, created.roleName);
    const policyOk = await policyExists(iamClient, created.policyArn);

    if (roleOk) pass(`Role exists:   ${created.roleName}`);
    else fail(`Role NOT found: ${created.roleName}`);

    if (policyOk) pass(`Policy exists: ${created.policyArn}`);
    else fail(`Policy NOT found: ${created.policyArn}`);

    if (!roleOk || !policyOk) {
      throw new Error('Setup failed — could not create IAM resources.');
    }

    // -----------------------------------------------------------------------
    // Phase 2: Simulate OLD delete logic (BUG)
    // -----------------------------------------------------------------------
    heading('Phase 2 — Simulate OLD deleteSchemaInspectorLambdaRole (buggy)');
    info('Old code only deletes the Lambda — does nothing with IAM resources.');
    await oldDeleteLogic(lambdaName, REGION);

    const roleAfterOld = await roleExists(iamClient, created.roleName);
    const policyAfterOld = await policyExists(iamClient, created.policyArn);

    if (roleAfterOld) {
      pass(`BUG CONFIRMED: Role still exists after old cleanup: ${created.roleName}`);
    } else {
      fail(`Unexpected: Role was deleted by old cleanup (should have leaked)`);
    }

    if (policyAfterOld) {
      pass(`BUG CONFIRMED: Policy still exists after old cleanup: ${created.policyArn}`);
    } else {
      fail(`Unexpected: Policy was deleted by old cleanup (should have leaked)`);
    }

    // -----------------------------------------------------------------------
    // Phase 3: Run FIXED delete logic
    // -----------------------------------------------------------------------
    heading('Phase 3 — Run FIXED deleteSchemaInspectorLambdaRole');
    info('Fixed code detaches policies → deletes policies → deletes role.');
    await fixedDeleteLogic(iamClient, lambdaName);

    // Small delay for IAM eventual consistency
    await sleep(2000);

    const roleAfterFix = await roleExists(iamClient, created.roleName);
    const policyAfterFix = await policyExists(iamClient, created.policyArn);

    if (!roleAfterFix) {
      pass(`FIX VERIFIED: Role successfully deleted: ${created.roleName}`);
    } else {
      fail(`Fix did NOT work: Role still exists: ${created.roleName}`);
    }

    if (!policyAfterFix) {
      pass(`FIX VERIFIED: Policy successfully deleted: ${created.policyArn}`);
    } else {
      fail(`Fix did NOT work: Policy still exists: ${created.policyArn}`);
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    heading('═══════════════════════════════════════════════════════');
    heading('  RESULTS');
    heading('═══════════════════════════════════════════════════════');

    const bugConfirmed = roleAfterOld && policyAfterOld;
    const fixWorks = !roleAfterFix && !policyAfterFix;

    if (bugConfirmed && fixWorks) {
      console.log(`\n  ${GREEN}${BOLD}ALL CHECKS PASSED${RESET}`);
      console.log(`  • Bug reproduced: old cleanup leaves IAM role + policy behind`);
      console.log(`  • Fix verified:   new cleanup properly removes all resources\n`);
    } else {
      console.log(`\n  ${RED}${BOLD}SOME CHECKS FAILED${RESET}`);
      console.log(`  • Bug reproduced: ${bugConfirmed ? 'YES' : 'NO'}`);
      console.log(`  • Fix works:      ${fixWorks ? 'YES' : 'NO'}\n`);
      process.exitCode = 1;
    }
  } finally {
    await forceCleanup(iamClient, roleName, policyArn);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  process.exitCode = 1;
});
