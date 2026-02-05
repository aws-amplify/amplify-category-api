/**
 * Usage: `yarn view-test-artifacts <buildBatchId>`
 *
 * N.B. It is important to have your local environment configured for the correct codebuild account before running the script.
 * This script caches resources, but in the case the local resource state is out of sync, you may need to wipe the asset directory
 * that is printed when the script begins.
 */

import * as process from 'process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
// eslint-disable-next-line import/no-extraneous-dependencies
import { CodeBuildClient, BatchGetBuildBatchesCommand } from '@aws-sdk/client-codebuild';
// eslint-disable-next-line import/no-extraneous-dependencies
import { S3Client, ListObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { fromIni } from '@aws-sdk/credential-provider-ini';
// eslint-disable-next-line import/no-extraneous-dependencies
import { SingleBar, Presets } from 'cli-progress';
import execa from 'execa';

const E2E_PROFILE_NAME = 'AmplifyAPIE2EProd';
const credentials = fromIni({ profile: E2E_PROFILE_NAME });
const s3 = new S3Client({ credentials });
const codeBuild = new CodeBuildClient({ credentials, region: 'us-east-1' });
const progressBar = new SingleBar({}, Presets.shades_classic);

type BuildStatus = 'FAILED' | 'FAULT' | 'IN_PROGRESS' | 'STOPPED' | 'SUCCEEDED' | 'TIMED_OUT';

const buildStatusToIcon: Record<BuildStatus, string> = {
  FAILED: '❌',
  FAULT: '🚫',
  IN_PROGRESS: '🏃',
  STOPPED: '➖',
  SUCCEEDED: '✅',
  TIMED_OUT: '⏰',
};

/**
 * Type modelling info we need to retrieve and display test artifacts in the UI.
 */
type TestArtifact = {
  jobName: string;
  buildStatus: BuildStatus;
  artifactLocation?: string;
};

/**
 * Utility method to filter out incomplete test artifact definitions.
 * @param artifact the potentially incomplete artifact to validate
 * @returns whether the artifact is complete or not
 */
const testArtifactIsComplete = (artifact: Partial<TestArtifact>): artifact is TestArtifact => artifact.jobName !== undefined;

const generateIndexFile = (directory: string, artifacts: TestArtifact[]): void => {
  const createArtifactRow = (artifact: TestArtifact): string => `<tr>
    <td>${artifact.jobName}</td>
    <td>${buildStatusToIcon[artifact.buildStatus]}[${artifact.buildStatus}]</td>
    <td>${artifact.artifactLocation ? `<a href="/${artifact.jobName}">Assets</a>` : ''}</td>
  </tr>`;

  const fileContents = `<html>
<head>
  <title>Test Artifacts</title>
  <style>
    table, th, td {
      border: 1px solid black;
    }
  </style>
</head>
<body>
    <h1>Test Artifact Directory</h1>
    <table>
      <tr>
        <th>Job Name</th>
        <th>Build Status</th>
        <th>Assets</th>
      </tr>
      ${artifacts.map(createArtifactRow).join('\n')}
    </table>
</body>
</html>`;
  fs.writeFileSync(path.join(directory, 'index.html'), fileContents);
};

/**
 * Given a codebuild batch id, download all the builds for that batch, and return the batch name, build status, and artifact location.
 * @param batchId the batch to look up.
 */
const retrieveArtifactsForBatch = async (batchId: string): Promise<TestArtifact[]> => {
  const { buildBatches } = await codeBuild.send(new BatchGetBuildBatchesCommand({ ids: [batchId] }));
  return (buildBatches || [])
    .flatMap((batch) =>
      (batch.buildGroups || []).map(
        (buildGroup) =>
          ({
            jobName: buildGroup.identifier,
            buildStatus: buildGroup.currentBuildSummary?.buildStatus,
            artifactLocation: buildGroup.currentBuildSummary?.primaryArtifact?.location,
          } as Partial<TestArtifact>),
      ),
    )
    .filter(testArtifactIsComplete);
};

const downloadSingleTestArtifact = async (tempDir: string, artifact: Required<TestArtifact>): Promise<unknown[]> => {
  const artifactDownloadPath = path.join(tempDir, artifact.jobName);
  fs.mkdirSync(artifactDownloadPath);
  const [Bucket, ...rest] = artifact.artifactLocation.split(':::')[1].split('/');
  const Prefix = rest.join('/');
  const listObjectsResponse = await s3.send(new ListObjectsCommand({ Bucket, Prefix }));

  const hasKey = (x: any): x is { Key: string } => x.Key !== undefined;

  if (!listObjectsResponse.Contents) {
    throw new Error('Expected results');
  }

  return Promise.all(
    listObjectsResponse.Contents.filter(hasKey).map(async ({ Key }) => {
      const filePath = path.join(artifactDownloadPath, Key.split('/').slice(3).join('/'));
      fs.ensureDirSync(path.dirname(filePath));
      const getObjectResponse = await s3.send(new GetObjectCommand({ Bucket, Key }));
      return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        (getObjectResponse.Body as NodeJS.ReadableStream).pipe(writer);
        writer.on('finish', () => resolve(undefined));
        writer.on('close', () => resolve(undefined));
        writer.on('error', reject);
      });
    }),
  );
};

/**
 * Given a list of test artifacts, including s3 arns, download each bucket contents to a newly created local temp directory.
 * Return the root path of this temp directory as output.
 * @param tempDir the temp directory to use for the artifacts to retrieve and download
 * @param artifacts the artifacts to retrieve and download
 */
const downloadTestArtifacts = async (tempDir: string, artifacts: Required<TestArtifact>[]): Promise<void> => {
  progressBar.start(artifacts.length, 0);
  await Promise.all(
    artifacts.map(async (artifact) => {
      await downloadSingleTestArtifact(tempDir, artifact);
      progressBar.increment();
      return;
    }),
  );
  progressBar.stop();
};

const inspectableStates = new Set<BuildStatus>(['FAILED', 'FAULT', 'TIMED_OUT']);

/**
 * Explicitly remove artifact from assets we don't want to download.
 */
const convertToArtifactForDownload = (artifact: TestArtifact): TestArtifact =>
  inspectableStates.has(artifact.buildStatus)
    ? artifact
    : {
        jobName: artifact.jobName,
        buildStatus: artifact.buildStatus,
      };

const constructLocalState = async (dir: string, buildId: string): Promise<void> => {
  const artifacts = await retrieveArtifactsForBatch(buildId);
  const testsWithNonDownloadedArtifactsStripped = artifacts.map(convertToArtifactForDownload);
  generateIndexFile(dir, testsWithNonDownloadedArtifactsStripped);
  const buildsWithArtifacts = testsWithNonDownloadedArtifactsStripped.filter(
    (artifact) => artifact.artifactLocation,
  ) as Required<TestArtifact>[];
  return downloadTestArtifacts(dir, buildsWithArtifacts);
};

const main = async (buildId: string): Promise<void> => {
  try {
    if (!buildId || buildId.length === 0) {
      throw new Error('Codebuild Batch Build Id is required as input');
    }
    const assetDir = path.join(os.tmpdir(), 'test-artifacts', buildId.replace(':', ''));
    console.log(`Will download and serve assets from: ${assetDir}`);
    fs.removeSync(assetDir);
    console.log('Retrieving and Downloading assets');
    fs.mkdirSync(assetDir, { recursive: true });
    await constructLocalState(assetDir, buildId);
    await execa('npx', ['http-server', assetDir], { stdio: 'inherit' });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main(process.argv[2]);
