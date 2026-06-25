import { join } from 'path';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

type TestRegion = {
  name: string;
  optIn: boolean;
  cognitoSupported: boolean;
  betaLayerDeployed: boolean; // is the beta layer deployed in this region
};

const DEFAULT_VARIABLES = {
  // The tests are using deprecated CDK APIs and the constant complaints
  // about it are making it hard to read logs.
  JSII_DEPRECATED: 'quiet',
};

const REPO_ROOT = join(__dirname, '..');

const supportedRegionsPath = join(REPO_ROOT, 'scripts', 'e2e-test-regions.json');
const supportedRegions: TestRegion[] = JSON.parse(fs.readFileSync(supportedRegionsPath, 'utf-8'));
const testRegions = supportedRegions.map((region) => region.name);
const supportedRegionsByRegionName: Record<string, TestRegion> = supportedRegions.reduce(
  (acc, region) => ({ ...acc, [region.name]: region }),
  {},
);

// list of regions the beta layer is not deployed in
// the tests should not use these regions when using the beta layer
const BETA_LAYER_NOT_DEPLOYED = supportedRegions.filter((region) => !region.betaLayerDeployed).map((region) => region.name);

// https://github.com/aws-amplify/amplify-cli/blob/d55917fd83140817a4447b3def1736f75142df44/packages/amplify-provider-awscloudformation/src/aws-regions.js#L4-L17
const v1TransformerSupportedRegionsPath = join(REPO_ROOT, 'scripts', 'v1-transformer-supported-regions.json');
const v1TransformerSupportedRegions = JSON.parse(fs.readFileSync(v1TransformerSupportedRegionsPath, 'utf-8')).map(
  (region: TestRegion) => region.name,
);

type TestTiming = {
  test: string;
  medianRuntime: number;
};

type ComputeType = 'BUILD_GENERAL1_SMALL' | 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_LARGE';

type BatchBuildJob = {
  identifier: string;
  buildspec: string;
  env: {
    'compute-type': ComputeType;
    variables?: { [string: string]: string };
  };
  'depend-on': string[] | string;
};

type ConfigBase = {
  batch: {
    'build-graph': BatchBuildJob[];
  };
  env: {
    'compute-type': ComputeType;
    shell: 'bash';
    variables: { [string: string]: string };
  };
};

type OSType = 'w' | 'l';

type CandidateJob = {
  region: string;
  os: OSType;
  tests: string[];
  useParentAccount: boolean;
  runSolo: boolean;
};

// Some services (eg. amazon lex, containers) are not available in all regions
// Tests added to this list will always run in the specified region
const FORCE_REGION_MAP = {
  interactions: 'us-west-2',
  containers: 'us-east-1',
  generation: 'us-west-2',
  conversation: 'us-west-2',
  custom_policies_container: 'us-east-1',
  'sql-pg-canary': 'us-east-1',
  'searchable-previous-deployment-had-node-to-node': 'us-west-1',
};

// some tests require additional time, the parent account can handle longer tests (up to 90 minutes)
const USE_PARENT_ACCOUNT = [
  'src/__tests__/graphql-v2/searchable-datastore',
  'src/__tests__/schema-searchable',
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts',
  'src/__tests__/generations/generation.test.ts',
  'src/__tests__/conversations/conversation.test.ts',
  'src/__tests__/sql-pg-canary.test.ts',
];
const TEST_TIMINGS_PATH = join(REPO_ROOT, 'scripts', 'test-timings.data.json');
const CODEBUILD_CONFIG_BASE_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow_base.yml');
const CODEBUILD_GENERATE_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow.yml');
const CODEBUILD_DEBUG_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'debug_workflow.yml');
// Split-batch outputs. These are generated alongside (not instead of) the combined
// e2e_workflow.yml above. Each is a self-contained batchspec carrying the full prep/build
// chain plus a disjoint subset of the e2e shards, so the two can be fired as separate
// CodeBuild batches that each stay under the orchestrator's in-flight ceiling.
// Batch A ("api+gql"): amplify-e2e-tests + graphql-transformers-e2e-tests shards.
// Batch B ("cdk"): amplify-graphql-api-construct-tests shards.
const CODEBUILD_GENERATE_API_GQL_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow_api_gql.yml');
const CODEBUILD_GENERATE_CDK_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow_cdk.yml');

const RUN_SOLO: (string | RegExp)[] = [
  'src/__tests__/apigw.test.ts',
  'src/__tests__/api_2.test.ts',
  'src/__tests__/api_11.test.ts',
  'src/__tests__/containers-api-1.test.ts',
  'src/__tests__/containers-api-2.test.ts',
  'src/__tests__/graphql-v2/searchable-datastore.test.ts',
  'src/__tests__/schema-searchable.test.ts',
  'src/__tests__/schema-auth-1.test.ts',
  'src/__tests__/schema-auth-2.test.ts',
  'src/__tests__/schema-auth-3.test.ts',
  'src/__tests__/schema-auth-4.test.ts',
  'src/__tests__/schema-auth-5.test.ts',
  'src/__tests__/schema-auth-6.test.ts',
  'src/__tests__/schema-auth-7.test.ts',
  'src/__tests__/schema-auth-8.test.ts',
  'src/__tests__/schema-auth-9.test.ts',
  'src/__tests__/schema-auth-10.test.ts',
  'src/__tests__/schema-auth-11.test.ts',
  'src/__tests__/schema-auth-12.test.ts',
  'src/__tests__/schema-auth-13.test.ts',
  'src/__tests__/schema-auth-14.test.ts',
  'src/__tests__/schema-auth-15.test.ts',
  'src/__tests__/schema-iterative-rollback-1.test.ts',
  'src/__tests__/schema-iterative-rollback-2.test.ts',
  'src/__tests__/schema-iterative-update-4.test.ts',
  'src/__tests__/schema-iterative-update-5.test.ts',
  'src/__tests__/schema-model.test.ts',
  'src/__tests__/schema-key.test.ts',
  'src/__tests__/schema-connection.test.ts',
  'src/__tests__/graphql-v2/searchable-node-to-node-encryption/searchable-previous-deployment-no-node-to-node.test.ts',
  'src/__tests__/graphql-v2/searchable-node-to-node-encryption/searchable-previous-deployment-had-node-to-node.test.ts',
  /src\/__tests__\/api_1.*\.test\.ts/,
  // GraphQL E2E tests
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts',
  'src/__tests__/HttpTransformer.e2e.test.ts',
  'src/__tests__/HttpTransformerV2.e2e.test.ts',
  // Deploy Velocity tests
  /src\/__tests__\/deploy-velocity(-temporarily-disabled)?\/.*\.test\.ts/,
  // SQL tests
  /src\/__tests__\/rds-.*\.test\.ts/,
  /src\/__tests__\/sql-.*\.test\.ts/,
  // CDK tests
  /src\/__tests__\/base-cdk.*\.test\.ts/,
  'src/__tests__/admin-role.test.ts',
  'src/__tests__/all-auth-modes.test.ts',
  'src/__tests__/amplify-ddb-canary.test.ts',
  'src/__tests__/amplify-table-1.test.ts',
  'src/__tests__/amplify-table-2.test.ts',
  'src/__tests__/amplify-table-3.test.ts',
  'src/__tests__/amplify-table-4.test.ts',
  'src/__tests__/api_canary.test.ts',
  'src/__tests__/custom-query-mutation-extension.test.ts',
  'src/__tests__/default-ddb-canary.test.ts',
  /src\/__tests__\/group-auth\/.*\.test\.ts/,
  /src\/__tests__\/owner-auth\/.*\.test\.ts/,
  /src\/__tests__\/relationships\/.*\.test\.ts/,
  /src\/__tests__\/restricted-field-auth\/.*\.test\.ts/,
  // Generation tests
  'src/__tests__/generations/generation.test.ts',
  // Conversation tests
  'src/__tests__/conversations/conversation.test.ts',
  // Predictions tests
  'src/__tests__/PredictionsTransformerV2Tests.e2e.test.ts',
];

const RUN_IN_ALL_REGIONS = [
  // DDB tests
  'src/__tests__/api_canary.test.ts',
  // CDK tests
  'src/__tests__/base-cdk.test.ts',
];

const RUN_IN_NON_OPT_IN_REGIONS: (string | RegExp)[] = [
  // SQL tests (top-level and nested under auth/relationships directories)
  /src\/__tests__\/rds-.*\.test\.ts/,
  /src\/__tests__\/sql-.*\.test\.ts/,
  /src\/__tests__\/.*sql.*\.test\.ts/,
  // Restricted field auth gen2 tests also create RDS instances
  /src\/__tests__\/restricted-field-auth\/.*gen2.*\.test\.ts/,
  // Searchable tests
  /src\/__tests__\/.*searchable.*\.test\.ts/,
  // Tests that use Auth Construct
  'src/__tests__/ddb-iam-access.test.ts',
];

const RUN_IN_COGNITO_REGIONS: (string | RegExp)[] = [
  /src\/__tests__\/.*userpool.*\.test\.ts/,
  /src\/__tests__\/group-auth\/.*\.test\.ts/,
  /src\/__tests__\/owner-auth\/.*\.test\.ts/,
  /src\/__tests__\/restricted-field-auth\/.*\.test\.ts/,
  /src\/__tests__\/RelationalWithAuthV2NonRedacted.e2e.test.ts/,
  /src\/__tests__\/AuthV2TransformerIAM.test.ts/,
  /src\/__tests__\/AuthV2ExhaustiveT3D.test.ts/,
  /src\/__tests__\/AuthV2ExhaustiveT3C.test.ts/,
];

const TEST_REGION_EXCLUSIONS: Record<string, string[]> = {
  // Rekognition is not supported in ap-northeast-3
  'src/__tests__/PredictionsTransformerV2Tests.e2e.test.ts': ['ap-northeast-3'],
};

const RUN_IN_V1_TRANSFORMER_REGIONS = ['src/__tests__/schema-searchable.test.ts'];

const DEBUG_FLAG = '--debug';

const EXCLUDE_TEST_IDS: string[] = [];

const MAX_WORKERS = 5;

/**
 * Maximum number of e2e CodeBuild shards allowed to be in-flight at once.
 *
 * Every shard used to depend only on `publish_to_local_registry`, so the whole
 * suite became runnable simultaneously and overran the CodeBuild project's
 * concurrent-build limit. The shards are instead chained into a sliding window:
 * the first `E2E_WAVE_SIZE` shards depend on the upstream build, and each later
 * shard `i` depends on shard `i - E2E_WAVE_SIZE`. This caps concurrency at
 * `E2E_WAVE_SIZE` while preserving the deterministic shard ordering.
 *
 * Tune this single constant to change the concurrency cap.
 */
const E2E_WAVE_SIZE = 90;

/**
 * In-flight shard cap applied INDEPENDENTLY within each split batch (see
 * {@link CODEBUILD_GENERATE_API_GQL_CONFIG_PATH} / {@link CODEBUILD_GENERATE_CDK_CONFIG_PATH}).
 *
 * This is the peak number of simultaneously in-flight shards per batch: within a batch the first
 * `SPLIT_E2E_WAVE_SIZE` shards run off `publish_to_local_registry` and each later shard is chained
 * `SPLIT_E2E_WAVE_SIZE` positions back, so at most this many shards are ever runnable at once. 95 is
 * the intended cap — just under the ~100 simultaneously-in-progress builds at which the CodeBuild
 * batch orchestrator faults materially. With this window the ~105-shard cdk batch peaks at exactly
 * 95. The combined batch uses {@link E2E_WAVE_SIZE}; each batch is staggered over its own shard
 * array, never across the combined list.
 */
const SPLIT_E2E_WAVE_SIZE = 95;

// eslint-disable-next-line import/namespace
const loadConfigBase = (): ConfigBase => yaml.load(fs.readFileSync(CODEBUILD_CONFIG_BASE_PATH, 'utf8')) as ConfigBase;

// eslint-disable-next-line import/namespace
const saveConfig = (config: any, outputPath: string): void =>
  fs.writeFileSync(outputPath, ['# auto generated file. DO NOT EDIT manually', yaml.dump(config, { noRefs: true })].join('\n'));

// eslint-disable-next-line import/namespace
const loadTestTimings = (): { timingData: TestTiming[] } => JSON.parse(fs.readFileSync(TEST_TIMINGS_PATH, 'utf-8'));

const getTestFiles = (dir: string, pattern = 'src/**/*.test.ts'): string[] => glob.sync(pattern, { cwd: dir });

const createJob = (os: OSType, jobIdx: number, runSolo = false): CandidateJob => ({
  region: testRegions[jobIdx % testRegions.length],
  os,
  tests: [],
  useParentAccount: false,
  runSolo,
});

const getTestNameFromPath = (testSuitePath: string, region?: string): string => {
  const startIndex = testSuitePath.lastIndexOf('/') + 1;
  const endIndex = testSuitePath.lastIndexOf('.test');
  const regionSuffix =
    RUN_IN_ALL_REGIONS.find((allRegions) => testSuitePath === allRegions || testSuitePath.match(allRegions)) && region ? `-${region}` : '';

  return testSuitePath.substring(startIndex, endIndex).split('.e2e').join('').split('.').join('-').concat(regionSuffix);
};

const splitTests = (
  baseJobLinux: any,
  testDirectory: string,
  useBetaLayer: boolean = false,
  pickTests?: (testSuites: string[]) => string[],
): BatchBuildJob[] => {
  const output: any[] = [];
  let testSuites = getTestFiles(testDirectory);
  if (pickTests && typeof pickTests === 'function') {
    testSuites = pickTests(testSuites);
  }
  if (testSuites.length === 0) {
    return output;
  }
  const testFileRunTimes = loadTestTimings().timingData;

  testSuites.sort((a, b) => {
    const runtimeA = testFileRunTimes.find((t: any) => t.test === a)?.medianRuntime ?? 30;
    const runtimeB = testFileRunTimes.find((t: any) => t.test === b)?.medianRuntime ?? 30;
    return runtimeA - runtimeB;
  });

  const generateJobsForOS = (os: OSType): CandidateJob[] => {
    const soloJobs = [];
    let jobIdx = 0;
    const osJobs = [createJob(os, jobIdx)];
    jobIdx++;
    for (const test of testSuites) {
      const currentJob = osJobs[osJobs.length - 1];

      const USE_PARENT = USE_PARENT_ACCOUNT.some((usesParent) => test.startsWith(usesParent));

      if (RUN_SOLO.find((solo) => test === solo || test.match(solo))) {
        if (RUN_IN_ALL_REGIONS.find((allRegionsTest) => test === allRegionsTest || test.match(allRegionsTest))) {
          // always run these jobs in regions that do not have the beta layer deployed
          const candidateRegions = filterCandidateRegions(test, testRegions, false);
          candidateRegions.forEach((region) => {
            const newSoloJob = createJob(os, jobIdx, true);
            jobIdx++;
            newSoloJob.tests.push(test);
            newSoloJob.region = region;
            soloJobs.push(newSoloJob);
          });
          continue;
        }
        const newSoloJob = createJob(os, jobIdx, true);
        jobIdx++;
        newSoloJob.tests.push(test);

        if (USE_PARENT) {
          newSoloJob.useParentAccount = true;
        }
        setJobRegion(test, newSoloJob, jobIdx, useBetaLayer);
        soloJobs.push(newSoloJob);
        continue;
      }

      // add the test
      currentJob.tests.push(test);
      setJobRegion(test, currentJob, jobIdx, useBetaLayer);
      if (USE_PARENT) {
        currentJob.useParentAccount = true;
      }

      // create a new job once the current job is full;
      if (currentJob.tests.length >= MAX_WORKERS) {
        osJobs.push(createJob(os, jobIdx));
        jobIdx++;
      }
    }
    return [...osJobs, ...soloJobs];
  };

  const linuxJobs = generateJobsForOS('l');
  const getIdentifier = (names: string): string => `${names.replace(/-/g, '_')}`.substring(0, 127);
  const result: any[] = [];
  linuxJobs.forEach((j) => {
    if (j.tests.length !== 0) {
      const names = j.tests.map((tn) => getTestNameFromPath(tn, j.region)).join('_');
      const tmp = {
        ...JSON.parse(JSON.stringify(baseJobLinux)), // deep clone base job
        identifier: getIdentifier(names),
      };
      tmp.env.variables = tmp.env.variables ?? {};
      tmp.env.variables.TEST_SUITE = j.tests.join('|');
      tmp.env.variables.CLI_REGION = j.region;
      if (j.useParentAccount) {
        tmp.env.variables.USE_PARENT_ACCOUNT = 1;
      }
      if (j.runSolo) {
        tmp.env['compute-type'] = 'BUILD_GENERAL1_MEDIUM';
        // BUILD_GENERAL1_MEDIUM has 7GB of memory. 6656 = 6.5GB. Leave 0.5GB for the OS and other processes.
        tmp.env.variables.NODE_OPTIONS = '--max-old-space-size=6656';
      }
      result.push(tmp);
    }
  });
  return result;
};

const setJobRegion = (test: string, job: CandidateJob, jobIdx: number, useBetaLayer: boolean): void => {
  const FORCE_REGION = Object.keys(FORCE_REGION_MAP).find((key) => {
    const testName = getTestNameFromPath(test);
    return testName.startsWith(key);
  }) as keyof typeof FORCE_REGION_MAP;

  if (FORCE_REGION) {
    job.region = FORCE_REGION_MAP[FORCE_REGION];
    return;
  }

  // There are no opt-in regions in V1 transformer supported regions
  if (RUN_IN_V1_TRANSFORMER_REGIONS.some((runInV1Transformer) => test.startsWith(runInV1Transformer))) {
    job.region = v1TransformerSupportedRegions[jobIdx % v1TransformerSupportedRegions.length];
    return;
  }

  const candidateRegions = filterCandidateRegions(test, testRegions, useBetaLayer);

  if (candidateRegions.length === 0) {
    throw new Error(`No candidate regions found for test ${test}`);
  }

  job.region = candidateRegions[jobIdx % candidateRegions.length];
};

const filterCandidateRegions = (test: string, candidateRegions: string[], useBetaLayer: boolean): string[] => {
  let resolvedRegions = [...candidateRegions];

  const excludedRegions = TEST_REGION_EXCLUSIONS[test];
  if (excludedRegions) {
    resolvedRegions = resolvedRegions.filter((region) => !excludedRegions.includes(region));
  }

  // Parent E2E account does not have opt-in regions. Choose non-opt-in region.
  const shouldUseParentAccount = USE_PARENT_ACCOUNT.some((usesParent) => test.startsWith(usesParent));

  // If the tests are explicitly specified as to be run in opt-in regions, respect that.
  const shouldRunInNonOptInRegion = RUN_IN_NON_OPT_IN_REGIONS.some(
    (nonOptInTest) => test.toLowerCase() === nonOptInTest || test.toLowerCase().match(nonOptInTest),
  );

  if (shouldUseParentAccount || shouldRunInNonOptInRegion) {
    resolvedRegions = resolvedRegions.filter((region) => !supportedRegionsByRegionName[region].optIn);
  }

  // Some tests require Cognito User Pools or Identity Pools
  const shouldRunInCognitoRegion = RUN_IN_COGNITO_REGIONS.some(
    (cognitoTest) => test.toLowerCase() === cognitoTest || test.toLowerCase().match(cognitoTest),
  );
  if (shouldRunInCognitoRegion) {
    resolvedRegions = resolvedRegions.filter((region) => supportedRegionsByRegionName[region].cognitoSupported);
  }

  if (useBetaLayer) {
    resolvedRegions = resolvedRegions.filter((region) => !BETA_LAYER_NOT_DEPLOYED.includes(region));
  }

  return resolvedRegions;
};

/**
 * Caps concurrent e2e shards at {@link E2E_WAVE_SIZE} by chaining them into a
 * sliding window. Shards keep their deterministic order: the first
 * `E2E_WAVE_SIZE` shards retain their existing upstream dependency
 * (`publish_to_local_registry`), and every later shard `i` is rewired to depend
 * on the shard `E2E_WAVE_SIZE` positions earlier, so at most `E2E_WAVE_SIZE`
 * shards are runnable at any time.
 *
 * Note: CodeBuild `depend-on` starts a successor only after its predecessor
 * SUCCEEDS, so a failed shard skips the shard `E2E_WAVE_SIZE` positions later in
 * the chain. Each shard buildspec therefore emits a primary artifact so it can
 * be a valid predecessor.
 *
 * @param builds Ordered e2e shard jobs; their `depend-on` is rewired in place.
 * @param windowSize Maximum number of shards allowed to be in-flight at once.
 */
const applyWaveStaggering = (builds: BatchBuildJob[], windowSize: number = E2E_WAVE_SIZE): void => {
  builds.forEach((build, i) => {
    build['depend-on'] = i < windowSize ? ['publish_to_local_registry'] : [builds[i - windowSize].identifier];
  });
};

/** The e2e shard jobs grouped by the test package (family) they were generated from. */
type ShardFamilies = {
  /** amplify-e2e-tests shards (`run_e2e_tests`). */
  api: BatchBuildJob[];
  /** amplify-graphql-api-construct-tests shards (`run_cdk_tests`). */
  cdk: BatchBuildJob[];
  /** graphql-transformers-e2e-tests shards (`gql_e2e_tests`). */
  gql: BatchBuildJob[];
};

/** Builds the base shard template shared by every e2e family (LARGE compute, high heap). */
const makeShardTemplate = (identifier: string, buildspec: string): BatchBuildJob => ({
  identifier,
  buildspec,
  env: {
    'compute-type': 'BUILD_GENERAL1_LARGE',
    variables: {
      // BUILD_GENERAL1_LARGE has 15GB of memory. 14848MB = 14.5GB. Leave 0.5GB for the OS and other processes.
      NODE_OPTIONS: '--max-old-space-size=14848',
    },
  },
  'depend-on': ['publish_to_local_registry'],
});

/** Generates the e2e shard jobs for all three test families from the filesystem. */
const buildShardFamilies = (useBetaLayer: boolean): ShardFamilies => ({
  api: splitTests(
    makeShardTemplate('run_e2e_tests', 'codebuild_specs/run_e2e_tests.yml'),
    join(REPO_ROOT, 'packages', 'amplify-e2e-tests'),
    useBetaLayer,
  ),
  cdk: splitTests(
    makeShardTemplate('run_cdk_tests', 'codebuild_specs/run_cdk_tests.yml'),
    join(REPO_ROOT, 'packages', 'amplify-graphql-api-construct-tests'),
    useBetaLayer,
  ),
  gql: splitTests(
    makeShardTemplate('gql_e2e_tests', 'codebuild_specs/graphql_e2e_tests.yml'),
    join(REPO_ROOT, 'packages', 'graphql-transformers-e2e-tests'),
    useBetaLayer,
  ),
});

/** Builds the per-batch resource-cleanup job, gated on the batch's first shard. */
const createCleanupJob = (builds: BatchBuildJob[]): BatchBuildJob => ({
  identifier: 'cleanup_e2e_resources',
  buildspec: 'codebuild_specs/cleanup_e2e_resources.yml',
  env: {
    'compute-type': 'BUILD_GENERAL1_SMALL',
    variables: {
      ...DEFAULT_VARIABLES,
    },
  },
  'depend-on': builds.length > 0 ? [builds[0].identifier] : 'publish_to_local_registry',
});

/** Deep-clones a shard array so per-batch `depend-on` rewrites never leak across batches. */
const cloneBuilds = (builds: BatchBuildJob[]): BatchBuildJob[] => JSON.parse(JSON.stringify(builds));

// Non-test prep/build jobs the e2e shards transitively require. Every split batch loads the full
// base graph (which provides all of these), so the assertion below guards against the base graph
// drifting out from under the split batches.
const ESSENTIAL_NON_TEST_IDENTIFIERS = [
  'build_linux',
  'build_windows',
  'test',
  'verify_cdk_version',
  'verify_api_extract',
  'verify_yarn_lock',
  'verify_dependency_licenses_extract',
  'publish_to_local_registry',
  'cleanup_e2e_resources',
];

/**
 * Generates the legacy single-batch graph at {@link CODEBUILD_GENERATE_CONFIG_PATH} (or the debug
 * spec). This preserves the original behavior so flows that still consume e2e_workflow.yml — the
 * project's default buildspec and the pre-commit hook — keep working.
 */
const generateCombinedConfig = (allShards: BatchBuildJob[], filteredTests: string[]): void => {
  const configBase: ConfigBase = loadConfigBase();
  const baseBuildGraph = configBase.batch['build-graph'];

  let builds = cloneBuilds(allShards);
  if (filteredTests.length > 0) {
    builds = builds.filter((build) => filteredTests.includes(build.identifier));
    if (filteredTests.includes(DEBUG_FLAG)) {
      builds = builds.map((build) => ({ ...build, 'debug-session': true }));
    }
  }
  if (EXCLUDE_TEST_IDS.length > 0) {
    builds = builds.filter((build) => !EXCLUDE_TEST_IDS.includes(build.identifier));
  }

  // Cap concurrent e2e shards with a chained sliding window (see E2E_WAVE_SIZE).
  applyWaveStaggering(builds);

  console.log(`Total number of splitted jobs: ${builds.length}`);
  configBase.batch['build-graph'] = [...baseBuildGraph, ...builds, createCleanupJob(builds)];

  const outputPath = filteredTests.includes(DEBUG_FLAG) ? CODEBUILD_DEBUG_CONFIG_PATH : CODEBUILD_GENERATE_CONFIG_PATH;
  saveConfig(configBase, outputPath);
  console.log(`Successfully generated the buildspec at ${outputPath}`);
};

/**
 * Writes one self-contained split batch: the full base prep/build graph + the given (already
 * cloned) shards staggered at {@link SPLIT_E2E_WAVE_SIZE} + the batch's own cleanup job.
 *
 * @returns The staggered shard jobs (test shards only) for reconciliation.
 */
const writeBatchConfig = (label: string, shards: BatchBuildJob[], outputPath: string): BatchBuildJob[] => {
  const configBase: ConfigBase = loadConfigBase();
  const baseBuildGraph = configBase.batch['build-graph'];

  applyWaveStaggering(shards, SPLIT_E2E_WAVE_SIZE);
  configBase.batch['build-graph'] = [...baseBuildGraph, ...shards, createCleanupJob(shards)];

  saveConfig(configBase, outputPath);
  console.log(`Generated "${label}" batch (${shards.length} shards) at ${outputPath}`);
  return shards;
};

/**
 * Generates the two self-contained split batches and runs the reconciliation self-check:
 * Batch A ("api+gql") = api + gql shards, Batch B ("cdk") = cdk shards.
 */
const generateSplitConfigs = (families: ShardFamilies): void => {
  const apiGqlShards = writeBatchConfig('api+gql', cloneBuilds([...families.api, ...families.gql]), CODEBUILD_GENERATE_API_GQL_CONFIG_PATH);
  const cdkShards = writeBatchConfig('cdk', cloneBuilds(families.cdk), CODEBUILD_GENERATE_CDK_CONFIG_PATH);

  assertReconciliation(families, apiGqlShards, cdkShards);
};

/**
 * Programmatic guarantee that splitting dropped nothing: the union of test-shard identifiers across
 * the two split batches must exactly equal the full combined set, with no shard in both batches.
 * Also asserts each batch carries the essential non-test jobs. Prints a report and throws on FAIL.
 */
const assertReconciliation = (families: ShardFamilies, apiGqlShards: BatchBuildJob[], cdkShards: BatchBuildJob[]): void => {
  const combinedIds = [...families.api, ...families.cdk, ...families.gql].map((b) => b.identifier).sort();
  const splitIds = [...apiGqlShards, ...cdkShards].map((b) => b.identifier).sort();

  const combinedSet = new Set(combinedIds);
  const splitSet = new Set(splitIds);
  const missing = combinedIds.filter((id) => !splitSet.has(id));
  const extra = splitIds.filter((id) => !combinedSet.has(id));
  const duplicates = splitIds.filter((id, idx) => splitIds.indexOf(id) !== idx);

  const cdkSet = new Set(cdkShards.map((b) => b.identifier));
  const overlap = apiGqlShards.map((b) => b.identifier).filter((id) => cdkSet.has(id));

  const missingEssential = ESSENTIAL_NON_TEST_IDENTIFIERS.filter(
    (id) => !batchContainsJob(CODEBUILD_GENERATE_API_GQL_CONFIG_PATH, id) || !batchContainsJob(CODEBUILD_GENERATE_CDK_CONFIG_PATH, id),
  );

  const pass =
    missing.length === 0 && extra.length === 0 && duplicates.length === 0 && overlap.length === 0 && missingEssential.length === 0;

  console.log('\n===== e2e split reconciliation =====');
  console.log(`combined shards : ${combinedIds.length}`);
  console.log(`api+gql batch   : ${apiGqlShards.length} shards`);
  console.log(`cdk batch       : ${cdkShards.length} shards`);
  console.log(`split total     : ${splitIds.length}`);
  if (missing.length > 0) console.log(`MISSING shards  : ${JSON.stringify(missing)}`);
  if (extra.length > 0) console.log(`EXTRA shards    : ${JSON.stringify(extra)}`);
  if (duplicates.length > 0) console.log(`DUPLICATE shards: ${JSON.stringify(duplicates)}`);
  if (overlap.length > 0) console.log(`OVERLAP shards  : ${JSON.stringify(overlap)}`);
  if (missingEssential.length > 0) console.log(`MISSING non-test jobs in a batch: ${JSON.stringify(missingEssential)}`);
  console.log(`result          : ${pass ? 'PASS' : 'FAIL'}`);
  console.log('====================================\n');

  if (!pass) {
    throw new Error('e2e split reconciliation FAILED: the two batches do not exactly cover the combined shard set.');
  }
};

/** Reads a generated batchspec from disk and reports whether it contains a job with `identifier`. */
const batchContainsJob = (configPath: string, identifier: string): boolean => {
  // eslint-disable-next-line import/namespace
  const config = yaml.load(fs.readFileSync(configPath, 'utf8')) as ConfigBase;
  return config.batch['build-graph'].some((job) => job.identifier === identifier);
};

const main = (): void => {
  const useBetaLayer = process.argv[2] === 'beta';
  const filteredTests = process.argv.slice(3);
  const isDebug = filteredTests.includes(DEBUG_FLAG);

  const families = buildShardFamilies(useBetaLayer);

  // Combined batch: the legacy single-batch graph (filter/exclude/debug paths preserved).
  generateCombinedConfig([...families.api, ...families.cdk, ...families.gql], filteredTests);

  // Split batches: two self-contained graphs, each independently waved. The debug and
  // single-test filtering flows only target the combined/debug spec, so skip the split
  // generation in those modes.
  if (!isDebug && filteredTests.length === 0) {
    generateSplitConfigs(families);
  }
};

main();
