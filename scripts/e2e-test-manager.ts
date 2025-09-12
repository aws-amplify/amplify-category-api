#!/usr/bin/env ts-node

/**
 * E2E Test Management Script
 * 
 * Usage:
 *   yarn ts-node scripts/e2e-test-manager.ts status <buildBatchId>
 *   yarn ts-node scripts/e2e-test-manager.ts retry <buildBatchId> [maxRetries]
 *   yarn ts-node scripts/e2e-test-manager.ts monitor <buildBatchId> [maxRetries]
 */

import { CodeBuild, SharedIniFileCredentials } from 'aws-sdk';
import * as process from 'process';

const E2E_PROFILE_NAME = 'AmplifyAPIE2EProd';
const REGION = 'us-east-1';
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
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

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const getBatchStatus = async (batchId: string): Promise<BatchStatus> => {
  const { buildBatches } = await codeBuild.batchGetBuildBatches({ ids: [batchId] }).promise();
  
  if (!buildBatches || buildBatches.length === 0) {
    throw new Error(`Build batch ${batchId} not found`);
  }

  const batch = buildBatches[0];
  const builds: BuildSummary[] = (batch.buildGroups || []).map(group => ({
    identifier: group.identifier || 'unknown',
    buildStatus: group.currentBuildSummary?.buildStatus as BuildStatus || 'IN_PROGRESS',
    buildId: group.currentBuildSummary?.arn?.split('/').pop()
  }));

  const failedBuilds = builds.filter(b => ['FAILED', 'FAULT', 'TIMED_OUT'].includes(b.buildStatus));
  const inProgressBuilds = builds.filter(b => b.buildStatus === 'IN_PROGRESS');

  return {
    batchId,
    batchStatus: batch.buildBatchStatus || 'UNKNOWN',
    builds,
    failedBuilds,
    inProgressBuilds
  };
};

const printStatus = (status: BatchStatus): void => {
  console.log(`\n=== Batch Status: ${status.batchId} ===`);
  console.log(`Batch Status: ${status.batchStatus}`);
  console.log(`Total Builds: ${status.builds.length}`);
  console.log(`Failed Builds: ${status.failedBuilds.length}`);
  console.log(`In Progress: ${status.inProgressBuilds.length}`);
  console.log(`Succeeded: ${status.builds.filter(b => b.buildStatus === 'SUCCEEDED').length}`);

  if (status.failedBuilds.length > 0) {
    console.log('\n❌ Failed Builds:');
    status.failedBuilds.forEach(build => {
      console.log(`  - ${build.identifier}: ${build.buildStatus}`);
    });
  }

  if (status.inProgressBuilds.length > 0) {
    console.log('\n🏃 In Progress:');
    status.inProgressBuilds.forEach(build => {
      console.log(`  - ${build.identifier}`);
    });
  }
};

const retryFailedBuilds = async (batchId: string): Promise<string> => {
  console.log(`Retrying failed builds for batch: ${batchId}`);
  
  // Use the existing cloudE2EDebug function which generates debug spec for failed tests
  const { execSync } = require('child_process');
  
  try {
    const result = execSync(`source scripts/cloud-utils.sh && cloudE2EDebug ${batchId}`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Extract the new batch ID from the output
    const match = result.match(/batch\/([^?]+)/);
    if (match) {
      return match[1];
    }
    throw new Error('Could not extract new batch ID from retry output');
  } catch (error) {
    console.error('Failed to retry builds:', error);
    throw error;
  }
};

const shouldRetryBuild = (build: BuildSummary): boolean => {
  // Don't retry if it's clearly a code bug (these patterns indicate infrastructure/test issues)
  const retryablePatterns = [
    'timeout',
    'network',
    'throttl',
    'rate limit',
    'service unavailable',
    'internal error'
  ];
  
  // For now, retry all failed builds - we can add more sophisticated logic later
  return ['FAILED', 'FAULT', 'TIMED_OUT'].includes(build.buildStatus);
};

const monitorBatch = async (batchId: string, maxRetries: number = DEFAULT_MAX_RETRIES): Promise<void> => {
  let currentBatchId = batchId;
  let retryCount = 0;

  console.log(`🔍 Monitoring batch: ${currentBatchId}`);
  console.log(`📊 Max retries: ${maxRetries}`);
  console.log(`⏰ Poll interval: ${POLL_INTERVAL_MS / 1000 / 60} minutes\n`);

  while (retryCount <= maxRetries) {
    const status = await getBatchStatus(currentBatchId);
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
        currentBatchId = await retryFailedBuilds(currentBatchId);
        retryCount++;
        console.log(`New batch ID: ${currentBatchId}`);
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
  const [command, batchId, maxRetriesStr] = process.argv.slice(2);
  const maxRetries = maxRetriesStr ? parseInt(maxRetriesStr, 10) : DEFAULT_MAX_RETRIES;

  if (!command || !batchId) {
    console.error('Usage: yarn ts-node scripts/e2e-test-manager.ts <command> <buildBatchId> [maxRetries]');
    console.error('Commands: status, retry, monitor');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'status':
        const status = await getBatchStatus(batchId);
        printStatus(status);
        break;

      case 'retry':
        const newBatchId = await retryFailedBuilds(batchId);
        console.log(`New batch started: ${newBatchId}`);
        break;

      case 'monitor':
        await monitorBatch(batchId, maxRetries);
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
