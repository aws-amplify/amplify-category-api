#!/usr/bin/env ts-node

/**
 * Polls TWO CodeBuild batches (the "api+gql" and "cdk" batches produced by the split e2e mode — see
 * scripts/cloud-utils.sh `cloudE2ESplit`) until both reach a terminal state, then reports aggregate
 * pass/fail across both. This is the local companion to e2e-test-manager.ts, which monitors a single
 * batch; the combined single-batch path is left unchanged.
 *
 * Usage:
 *   yarn ts-node scripts/wait-for-all-codebuild-split.ts <apiGqlBatchId> <cdkBatchId>
 *   yarn wait-for-all-codebuild-split <apiGqlBatchId> <cdkBatchId>
 */

import { CodeBuildClient, BatchGetBuildBatchesCommand } from '@aws-sdk/client-codebuild';
import { fromIni } from '@aws-sdk/credential-providers';
import * as process from 'process';

const E2E_PROFILE_NAME = 'AmplifyAPIE2EProd';
const REGION = 'us-east-1';
const POLL_INTERVAL_MS = 3 * 60 * 1000;
const TERMINAL_FAILURE_STATUSES = new Set(['FAILED', 'FAULT', 'STOPPED', 'TIMED_OUT']);
const IN_PROGRESS_STATUSES = new Set(['IN_PROGRESS', 'PENDING']);

const credentials = fromIni({ profile: E2E_PROFILE_NAME });
const codeBuild = new CodeBuildClient({ credentials, region: REGION });

type BatchStatus = {
  batchId: string;
  overallStatus: string;
  isComplete: boolean;
  incompleteJobs: string[];
  failedJobs: string[];
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const getBatchStatus = async (batchId: string): Promise<BatchStatus> => {
  const { buildBatches } = await codeBuild.send(new BatchGetBuildBatchesCommand({ ids: [batchId] }));
  const batch = buildBatches?.[0];
  const overallStatus = batch?.buildBatchStatus ?? 'UNKNOWN';
  const groups = batch?.buildGroups ?? [];
  const incompleteJobs = groups
    .filter((group) => IN_PROGRESS_STATUSES.has(group.currentBuildSummary?.buildStatus ?? ''))
    .map((group) => group.identifier ?? '');
  const failedJobs = groups
    .filter((group) => TERMINAL_FAILURE_STATUSES.has(group.currentBuildSummary?.buildStatus ?? ''))
    .map((group) => group.identifier ?? '');
  return {
    batchId,
    overallStatus,
    isComplete: incompleteJobs.length === 0 && !IN_PROGRESS_STATUSES.has(overallStatus),
    incompleteJobs,
    failedJobs,
  };
};

const main = async (): Promise<void> => {
  const batchIds = process.argv.slice(2).filter(Boolean);
  if (batchIds.length !== 2) {
    console.error('Expected exactly two batch IDs: <apiGqlBatchId> <cdkBatchId>');
    process.exit(1);
  }

  console.log(`Polling ${batchIds.length} batches: ${JSON.stringify(batchIds)}`);

  const finalStatuses = new Map<string, BatchStatus>();
  let pending = [...batchIds];
  while (pending.length > 0) {
    await sleep(POLL_INTERVAL_MS);
    const stillPending: string[] = [];
    for (const batchId of pending) {
      const status = await getBatchStatus(batchId);
      console.log(
        `batchId: ${batchId} - status: ${status.overallStatus} - incomplete: ${status.incompleteJobs.length} - failed: ${status.failedJobs.length}`,
      );
      if (status.isComplete) {
        finalStatuses.set(batchId, status);
      } else {
        stillPending.push(batchId);
      }
    }
    pending = stillPending;
  }

  let anyFailed = false;
  for (const batchId of batchIds) {
    const status = finalStatuses.get(batchId)!;
    const failed = status.failedJobs.length > 0 || TERMINAL_FAILURE_STATUSES.has(status.overallStatus);
    anyFailed = anyFailed || failed;
    console.log(`Batch ${batchId} ${failed ? 'FAILED' : 'SUCCEEDED'}. Failed jobs: ${JSON.stringify(status.failedJobs)}`);
  }

  if (anyFailed) {
    console.log('At least one batch failed. Exiting non-zero.');
    process.exit(1);
  }
  console.log('All batches succeeded.');
};

main()
  .then(() => console.log('done'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
