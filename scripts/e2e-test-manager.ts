#!/usr/bin/env ts-node

/**
 * E2E Test Management Script
 *
 * Usage:
 *   yarn ts-node scripts/e2e-test-manager.ts status <buildBatchId>
 *   yarn ts-node scripts/e2e-test-manager.ts retry <buildBatchId> [maxRetries]
 *   yarn ts-node scripts/e2e-test-manager.ts monitor <buildBatchId> [maxRetries]
 *   yarn ts-node scripts/e2e-test-manager.ts list [limit]
 *   yarn ts-node scripts/e2e-test-manager.ts failed <buildBatchId>
 *   yarn ts-node scripts/e2e-test-manager.ts logs <buildId>
 */

import { CodeBuild, SharedIniFileCredentials } from 'aws-sdk';
import * as process from 'process';

const E2E_PROFILE_NAME = 'AmplifyAPIE2EProd';
const REGION = 'us-east-1';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_RETRIES = 10;

const credentials = new SharedIniFileCredentials({ profile: E2E_PROFILE_NAME });
const codeBuild = new CodeBuild({ credentials, region: REGION });

type BuildStatus = 'FAILED' | 'FAULT' | 'IN_PROGRESS' | 'STOPPED' | 'SUCCEEDED' | 'TIMED_OUT';

interface BuildSummary {
  identifier: string;
  buildStatus: BuildStatus;
  buildId?: string;
}

interface BatchStatus {
  batchId: string;
  batchStatus: string;
  builds: BuildSummary[];
  failedBuilds: BuildSummary[];
  inProgressBuilds: BuildSummary[];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const getBatchStatus = async (batchId: string): Promise<BatchStatus> => {
  const { buildBatches } = await codeBuild.batchGetBuildBatches({ ids: [batchId] }).promise();

  if (!buildBatches || buildBatches.length === 0) {
    throw new Error(`Build batch ${batchId} not found`);
  }

  const batch = buildBatches[0];
  const builds: BuildSummary[] = (batch.buildGroups || []).map((group) => ({
    identifier: group.identifier || 'unknown',
    buildStatus: (group.currentBuildSummary?.buildStatus as BuildStatus) || 'IN_PROGRESS',
    buildId: group.currentBuildSummary?.arn?.split('/').pop(),
  }));

  const failedBuilds = builds.filter((b) => ['FAILED', 'FAULT', 'TIMED_OUT'].includes(b.buildStatus));
  const inProgressBuilds = builds.filter((b) => b.buildStatus === 'IN_PROGRESS');

  return {
    batchId,
    batchStatus: batch.buildBatchStatus || 'UNKNOWN',
    builds,
    failedBuilds,
    inProgressBuilds,
  };
};

const printStatus = (status: BatchStatus): void => {
  console.log(`\n=== Batch Status: ${status.batchId} ===`);
  console.log(`Batch Status: ${status.batchStatus}`);
  console.log(`Total Builds: ${status.builds.length}`);
  console.log(`Failed Builds: ${status.failedBuilds.length}`);
  console.log(`In Progress: ${status.inProgressBuilds.length}`);
  console.log(`Succeeded: ${status.builds.filter((b) => b.buildStatus === 'SUCCEEDED').length}`);

  if (status.failedBuilds.length > 0) {
    console.log('\n❌ Failed Builds:');
    status.failedBuilds.forEach((build) => {
      console.log(`  - ${build.identifier}: ${build.buildStatus}`);
    });
  }

  if (status.inProgressBuilds.length > 0) {
    console.log('\n🏃 In Progress:');
    status.inProgressBuilds.forEach((build) => {
      console.log(`  - ${build.identifier}`);
    });
  }
};

const retryFailedBuilds = async (batchId: string): Promise<string | undefined> => {
  console.log(`Retrying failed builds for batch: ${batchId}`);

  // Get the failed build IDs from the batch
  const status = await getBatchStatus(batchId);
  const failedBuildIds = status.failedBuilds.filter((build) => build.buildId).map((build) => build.buildId!);

  if (failedBuildIds.length === 0) {
    console.log('✅ No failed builds found to retry');
    return undefined;
  }

  console.log(`Retrying ${failedBuildIds.length} failed builds using retry-build-batch`);

  // Use AWS CLI retry-build-batch command for the entire batch
  const { execSync } = require('child_process');

  try {
    const result = execSync(`aws codebuild retry-build-batch --region=${REGION} --profile=${E2E_PROFILE_NAME} --id="${batchId}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    // Parse the result to get the new batch ID
    const output = JSON.parse(result);
    const newBatchId = output.buildBatch?.id;

    if (newBatchId) {
      console.log(`✅ New retry batch started: ${newBatchId}`);
      return newBatchId;
    } else {
      console.error('❌ Could not extract new batch ID from retry response');
      return undefined;
    }
  } catch (error) {
    console.error(`❌ Failed to retry batch ${batchId}:`, error.message);
    return undefined;
  }
};

const shouldRetryBuild = (build: BuildSummary): boolean => {
  // Don't retry if it's clearly a code bug (these patterns indicate infrastructure/test issues)
  const retryablePatterns = ['timeout', 'network', 'throttl', 'rate limit', 'service unavailable', 'internal error'];

  // For now, retry all failed builds - we can add more sophisticated logic later
  return ['FAILED', 'FAULT', 'TIMED_OUT'].includes(build.buildStatus);
};

const listRecentBatches = async (limit: number = 20): Promise<void> => {
  console.log(`🔍 Fetching ${limit} most recent build batches...`);

  const result = await codeBuild
    .listBuildBatches({
      maxResults: limit,
      sortOrder: 'DESCENDING',
    })
    .promise();

  if (!result.ids || result.ids.length === 0) {
    console.log('No build batches found');
    return;
  }

  // Get detailed info for the batches
  const { buildBatches } = await codeBuild.batchGetBuildBatches({ ids: result.ids }).promise();

  if (!buildBatches || buildBatches.length === 0) {
    console.log('No build batch details found');
    return;
  }

  console.log('\n=== Recent Build Batches ===');
  for (const batch of buildBatches) {
    const startTime = batch.startTime ? new Date(batch.startTime).toLocaleString() : 'Unknown';
    const status = batch.buildBatchStatus || 'Unknown';
    const buildCount = batch.buildGroups?.length || 0;
    const branch = batch.sourceVersion || 'Unknown';

    console.log(`${batch.id}`);
    console.log(`  Branch: ${branch}`);
    console.log(`  Status: ${status}`);
    console.log(`  Started: ${startTime}`);
    console.log(`  Builds: ${buildCount}`);
    console.log('');
  }
};

const getFailedBuilds = async (batchId: string): Promise<void> => {
  const status = await getBatchStatus(batchId);

  console.log(`\n=== Failed Builds for Batch: ${batchId} ===`);

  if (status.failedBuilds.length === 0) {
    console.log('✅ No failed builds found');
    return;
  }

  console.log(`❌ Found ${status.failedBuilds.length} failed builds:\n`);

  for (const build of status.failedBuilds) {
    console.log(`Build: ${build.identifier}`);
    console.log(`  Status: ${build.buildStatus}`);
    if (build.buildId) {
      console.log(`  Build ID: ${build.buildId}`);
      console.log(`  Logs: yarn e2e-logs ${build.buildId}`);
    }
    console.log('');
  }
};

const getBuildLogs = async (buildId: string): Promise<void> => {
  console.log(`📋 Fetching logs for build: ${buildId}`);

  try {
    const { builds } = await codeBuild.batchGetBuilds({ ids: [buildId] }).promise();

    if (!builds || builds.length === 0) {
      console.log('❌ Build not found');
      return;
    }

    const build = builds[0];
    const logGroup = build.logs?.groupName;
    const logStream = build.logs?.streamName;

    if (!logGroup || !logStream) {
      console.log('❌ No logs available for this build');
      return;
    }

    console.log(`\n=== Build Information ===`);
    console.log(`Build ID: ${buildId}`);
    console.log(`Status: ${build.buildStatus}`);
    console.log(`Project: ${build.projectName}`);
    console.log(`Log Group: ${logGroup}`);
    console.log(`Log Stream: ${logStream}`);

    // Use AWS CLI to get logs (more reliable than SDK for large logs)
    const { execSync } = require('child_process');

    console.log(`\n=== Recent Log Output ===`);
    try {
      const logOutput = execSync(
        `aws logs get-log-events --region=${REGION} --profile=${E2E_PROFILE_NAME} --log-group-name="${logGroup}" --log-stream-name="${logStream}" --start-from-head --limit=50 --query="events[*].message" --output=text`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 },
      );

      console.log(logOutput);
    } catch (error) {
      console.log('❌ Could not fetch log content:', error.message);
      console.log(`\nTo view logs manually:`);
      console.log(
        `aws logs get-log-events --region=${REGION} --profile=${E2E_PROFILE_NAME} --log-group-name="${logGroup}" --log-stream-name="${logStream}"`,
      );
    }
  } catch (error) {
    console.error('❌ Error fetching build logs:', error.message);
  }
};

const monitorBatch = async (batchId: string, maxRetries: number = DEFAULT_MAX_RETRIES): Promise<void> => {
  let retryCount = 0;

  console.log(`🔍 Monitoring batch: ${batchId}`);
  console.log(`📊 Max retries: ${maxRetries}`);
  console.log(`⏰ Poll interval: ${POLL_INTERVAL_MS / 1000 / 60} minutes\n`);

  while (retryCount <= maxRetries) {
    const status = await getBatchStatus(batchId);
    printStatus(status);

    // Check if batch is complete
    if (!['IN_PROGRESS', 'SUBMITTED'].includes(status.batchStatus)) {
      if (status.failedBuilds.length === 0) {
        console.log('\n✅ All builds succeeded!');
        return;
      }

      if (retryCount >= maxRetries) {
        console.log(`\n❌ Max retries (${maxRetries}) reached. Stopping.`);
        console.log(`Final failed builds: ${status.failedBuilds.length}`);
        return;
      }

      // Check if failures are retryable
      const retryableBuilds = status.failedBuilds.filter(shouldRetryBuild);
      if (retryableBuilds.length === 0) {
        console.log('\n🚫 No retryable builds found. Failures appear to be code-related.');
        return;
      }

      console.log(`\n🔄 Retrying ${retryableBuilds.length} failed builds (attempt ${retryCount + 1}/${maxRetries})`);

      try {
        const newBatchId = await retryFailedBuilds(batchId);
        if (newBatchId) {
          console.log(`✅ Retry successful. New batch ID: ${newBatchId}`);
          // Continue monitoring the original batch, not the retry
        } else {
          console.log(`❌ Retry failed. Continuing to monitor original batch.`);
        }
        retryCount++;
        console.log(`Retried failed builds. Continuing to monitor same batch.`);
      } catch (error) {
        console.error('Failed to retry builds:', error);
        return;
      }
    }

    console.log(`\n⏳ Waiting ${POLL_INTERVAL_MS / 1000 / 60} minutes before next check...`);
    await sleep(POLL_INTERVAL_MS);
  }
};

const main = async (): Promise<void> => {
  const [command, arg1, arg2] = process.argv.slice(2);

  if (!command) {
    console.error('Usage: yarn ts-node scripts/e2e-test-manager.ts <command> [args...]');
    console.error('Commands:');
    console.error('  status <batchId>           - Show batch status');
    console.error('  retry <batchId> [retries]  - Retry failed builds');
    console.error('  monitor <batchId> [retries] - Monitor batch with auto-retry');
    console.error('  list [limit]               - List recent batches (default: 20)');
    console.error('  failed <batchId>           - Show failed builds with log commands');
    console.error('  logs <buildId>             - Show build logs');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'status':
        if (!arg1) {
          console.error('Error: batchId required for status command');
          process.exit(1);
        }
        const status = await getBatchStatus(arg1);
        printStatus(status);
        break;

      case 'retry':
        if (!arg1) {
          console.error('Error: batchId required for retry command');
          process.exit(1);
        }
        const maxRetries = arg2 ? parseInt(arg2, 10) : DEFAULT_MAX_RETRIES;
        const newBatchId = await retryFailedBuilds(arg1);
        console.log(`New batch started: ${newBatchId}`);
        break;

      case 'monitor':
        if (!arg1) {
          console.error('Error: batchId required for monitor command');
          process.exit(1);
        }
        const monitorRetries = arg2 ? parseInt(arg2, 10) : DEFAULT_MAX_RETRIES;
        await monitorBatch(arg1, monitorRetries);
        break;

      case 'list':
        const limit = arg1 ? parseInt(arg1, 10) : 20;
        await listRecentBatches(limit);
        break;

      case 'failed':
        if (!arg1) {
          console.error('Error: batchId required for failed command');
          process.exit(1);
        }
        await getFailedBuilds(arg1);
        break;

      case 'logs':
        if (!arg1) {
          console.error('Error: buildId required for logs command');
          process.exit(1);
        }
        await getBuildLogs(arg1);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main().catch(console.error);
}
