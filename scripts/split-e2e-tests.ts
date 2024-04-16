import { join } from 'path';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

type TestRegion = {
  name: string;
  optIn: boolean;
};

const REPO_ROOT = join(__dirname, '..');

const supportedRegionsPath = join(REPO_ROOT, 'scripts', 'e2e-test-regions.json');
const suportedRegions: TestRegion[] = JSON.parse(fs.readFileSync(supportedRegionsPath, 'utf-8'));
const testRegions = suportedRegions.map((region) => region.name);
const nonOptInRegions = suportedRegions.filter((region) => !region.optIn).map((region) => region.name);

// https://github.com/aws-amplify/amplify-cli/blob/d55917fd83140817a4447b3def1736f75142df44/packages/amplify-provider-awscloudformation/src/aws-regions.js#L4-L17
const v1TransformerSupportedRegionsPath = join(REPO_ROOT, 'scripts', 'v1-transformer-supported-regions.json');
const v1TransformerSupportedRegions = JSON.parse(fs.readFileSync(v1TransformerSupportedRegionsPath, 'utf-8')).map(
  (region: TestRegion) => region.name,
);

type ForceTests = 'interactions' | 'containers';

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
    variables?: [string: string];
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
    variables: [string: string];
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
};

// some tests require additional time, the parent account can handle longer tests (up to 90 minutes)
const USE_PARENT_ACCOUNT = [
  'src/__tests__/transformer-migrations/searchable-migration',
  'src/__tests__/graphql-v2/searchable-datastore',
  'src/__tests__/schema-searchable',
  'src/__tests__/migration/api.key.migration2.test.ts',
  'src/__tests__/migration/api.key.migration3.test.ts',
  'src/__tests__/migration/api.key.migration4.test.ts',
  'src/__tests__/migration/api.key.migration5.test.ts',
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts',
];
const TEST_TIMINGS_PATH = join(REPO_ROOT, 'scripts', 'test-timings.data.json');
const CODEBUILD_CONFIG_BASE_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow_base.yml');
const CODEBUILD_GENERATE_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow.yml');
const CODEBUILD_DEBUG_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'debug_workflow.yml');
const RUN_SOLO: (string | RegExp)[] = [
  'src/__tests__/apigw.test.ts',
  'src/__tests__/api_2.test.ts',
  'src/__tests__/api_11.test.ts',
  'src/__tests__/containers-api-1.test.ts',
  'src/__tests__/containers-api-2.test.ts',
  'src/__tests__/graphql-v2/searchable-datastore.test.ts',
  'src/__tests__/migration/api.key.migration1.test.ts',
  'src/__tests__/migration/api.key.migration2.test.ts',
  'src/__tests__/migration/api.key.migration3.test.ts',
  'src/__tests__/migration/api.key.migration4.test.ts',
  'src/__tests__/migration/api.key.migration5.test.ts',
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
  'src/__tests__/transformer-migrations/function-migration.test.ts',
  'src/__tests__/transformer-migrations/searchable-migration.test.ts',
  'src/__tests__/transformer-migrations/model-migration.test.ts',
  'src/__tests__/graphql-v2/searchable-node-to-node-encryption/searchable-previous-deployment-no-node-to-node.test.ts',
  'src/__tests__/graphql-v2/searchable-node-to-node-encryption/searchable-previous-deployment-had-node-to-node.test.ts',
  /src\/__tests__\/api_1.*\.test\.ts/,
  // GraphQL E2E tests
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts',
  'src/__tests__/HttpTransformer.e2e.test.ts',
  'src/__tests__/HttpTransformerV2.e2e.test.ts',
  // Deploy Velocity tests
  /src\/__tests__\/deploy-velocity\/.*\.test\.ts/,
  // SQL tests
  /src\/__tests__\/rds-.*\.test\.ts/,
  /src\/__tests__\/sql-.*\.test\.ts/,
  // CDK tests
  /src\/__tests__\/base-cdk.*\.test\.ts/,
  'src/__tests__/amplify-table-1.test.ts',
  'src/__tests__/amplify-table-3.test.ts',
  'src/__tests__/amplify-table-4.test.ts',
  'src/__tests__/api_canary.test.ts',
  'src/__tests__/amplify-table-2.test.ts',
  'src/__tests__/admin-role.test.ts',
  'src/__tests__/all-auth-modes.test.ts',
  'src/__tests__/default-ddb-canary.test.ts',
  'src/__tests__/amplify-ddb-canary.test.ts',
];

const RUN_IN_ALL_REGIONS = [
  // DDB tests
  'src/__tests__/api_canary.test.ts',
  // CDK tests
  'src/__tests__/base-cdk.test.ts',
];

const RUN_IN_NON_OPT_IN_REGIONS: (string | RegExp)[] = [
  // SQL tests
  /src\/__tests__\/rds-.*\.test\.ts/,
  /src\/__tests__\/sql-.*\.test\.ts/,
  // Searchable tests
  /src\/__tests__\/.*searchable.*\.test\.ts/,
  // Tests that use Auth Construct
  'src/__tests__/ddb-iam-access.test.ts',
];

const RUN_IN_V1_TRANSFORMER_REGIONS = ['src/__tests__/schema-searchable.test.ts'];

const DEBUG_FLAG = '--debug';

const EXCLUDE_TEST_IDS: string[] = [];

const MAX_WORKERS = 4;

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

const splitTests = (baseJobLinux: any, testDirectory: string, pickTests?: (testSuites: string[]) => string[]): BatchBuildJob[] => {
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
        if (RUN_IN_ALL_REGIONS.find((allRegions) => test === allRegions || test.match(allRegions))) {
          const shouldRunInNonOptInRegion = RUN_IN_NON_OPT_IN_REGIONS.find(
            (nonOptInTest) => test.toLowerCase() === nonOptInTest || test.toLowerCase().match(nonOptInTest),
          );
          const regionsToRunTest = shouldRunInNonOptInRegion ? nonOptInRegions : testRegions;
          regionsToRunTest.forEach((region) => {
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
        setJobRegion(test, newSoloJob, jobIdx);
        soloJobs.push(newSoloJob);
        continue;
      }

      // add the test
      currentJob.tests.push(test);
      setJobRegion(test, currentJob, jobIdx);
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
      tmp.env.variables = {};
      tmp.env.variables.TEST_SUITE = j.tests.join('|');
      tmp.env.variables.CLI_REGION = j.region;
      if (j.useParentAccount) {
        tmp.env.variables.USE_PARENT_ACCOUNT = 1;
      }
      if (j.runSolo) {
        tmp.env['compute-type'] = 'BUILD_GENERAL1_SMALL';
      }
      result.push(tmp);
    }
  });
  return result;
};

const setJobRegion = (test: string, job: CandidateJob, jobIdx: number) => {
  const FORCE_REGION = Object.keys(FORCE_REGION_MAP).find((key) => {
    const testName = getTestNameFromPath(test);
    return testName.startsWith(key);
  });

  if (FORCE_REGION) {
    job.region = FORCE_REGION_MAP[FORCE_REGION as ForceTests];
    return;
  }

  // There are no opt-in regions in V1 transformer supported regions
  if (RUN_IN_V1_TRANSFORMER_REGIONS.some((runInV1Transformer) => test.startsWith(runInV1Transformer))) {
    job.region = v1TransformerSupportedRegions[jobIdx % v1TransformerSupportedRegions.length];
    return;
  }

  // Parent E2E account does not have opt-in regions. Choose non-opt-in region.
  // If the tests are explicitly specified as to be run in non-opt-in regions, follow that.
  if (
    RUN_IN_NON_OPT_IN_REGIONS.find((nonOptInTest) => test.toLowerCase() === nonOptInTest || test.toLowerCase().match(nonOptInTest)) ||
    USE_PARENT_ACCOUNT.some((usesParent) => test.startsWith(usesParent))
  ) {
    if (!nonOptInRegions.includes(job.region)) {
      job.region = nonOptInRegions[jobIdx % nonOptInRegions.length];
    }
  }
};

const main = (): void => {
  const filteredTests = process.argv.slice(2);
  const configBase: ConfigBase = loadConfigBase();
  const baseBuildGraph = configBase.batch['build-graph'];

  let builds = [
    ...splitTests(
      {
        identifier: 'run_e2e_tests',
        buildspec: 'codebuild_specs/run_e2e_tests.yml',
        env: {
          'compute-type': 'BUILD_GENERAL1_MEDIUM',
        },
        'depend-on': ['publish_to_local_registry'],
      },
      join(REPO_ROOT, 'packages', 'amplify-e2e-tests'),
    ),
    ...splitTests(
      {
        identifier: 'run_cdk_tests',
        buildspec: 'codebuild_specs/run_cdk_tests.yml',
        env: {
          'compute-type': 'BUILD_GENERAL1_MEDIUM',
        },
        'depend-on': ['publish_to_local_registry'],
      },
      join(REPO_ROOT, 'packages', 'amplify-graphql-api-construct-tests'),
    ),
    ...splitTests(
      {
        identifier: 'gql_e2e_tests',
        buildspec: 'codebuild_specs/graphql_e2e_tests.yml',
        env: {
          'compute-type': 'BUILD_GENERAL1_MEDIUM',
        },
        'depend-on': ['publish_to_local_registry'],
      },
      join(REPO_ROOT, 'packages', 'graphql-transformers-e2e-tests'),
    ),
  ];

  if (filteredTests.length > 0) {
    builds = builds.filter((build) => filteredTests.includes(build.identifier));
    if (filteredTests.includes(DEBUG_FLAG)) {
      builds = builds.map((build) => ({ ...build, 'debug-session': true }));
    }
  }
  if (EXCLUDE_TEST_IDS.length > 0) {
    builds = builds.filter((build) => !EXCLUDE_TEST_IDS.includes(build.identifier));
  }

  const cleanupResources: BatchBuildJob = {
    identifier: 'cleanup_e2e_resources',
    buildspec: 'codebuild_specs/cleanup_e2e_resources.yml',
    env: {
      'compute-type': 'BUILD_GENERAL1_SMALL',
    },
    'depend-on': builds.length > 0 ? [builds[0].identifier] : 'publish_to_local_registry',
  };

  console.log(`Total number of splitted jobs: ${builds.length}`);
  const currentBatch = [...baseBuildGraph, ...builds, cleanupResources];
  configBase.batch['build-graph'] = currentBatch;

  const outputPath = filteredTests.includes(DEBUG_FLAG) ? CODEBUILD_DEBUG_CONFIG_PATH : CODEBUILD_GENERATE_CONFIG_PATH;
  saveConfig(configBase, outputPath);
  console.log(`Successfully generated the buildspec at ${outputPath}`);
};

main();
