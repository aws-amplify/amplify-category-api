import { join } from 'path';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

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

// Ensure to update packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts is also updated this gets updated
const AWS_REGIONS_TO_RUN_TESTS = [
  'ap-northeast-2',
  'ap-south-1',
  'us-east-2',
  'eu-central-1',
  'ap-southeast-2',
  'eu-west-2',
  'us-west-2',
  'ap-southeast-1',
  'ca-central-1',
  'eu-north-1',
  'me-south-1',
  'eu-west-3',
  'eu-west-1',
  'sa-east-1',
  'us-east-1',
  'ap-northeast-1',
  'us-west-1',
  'eu-south-1',
  'ap-east-1',
];

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
const REPO_ROOT = join(__dirname, '..');
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
  // GraphQL E2E tests
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts',
  'src/__tests__/HttpTransformer.e2e.test.ts',
  'src/__tests__/HttpTransformerV2.e2e.test.ts',
  // Deploy Velocity tests
  /src\/__tests__\/deploy-velocity\/.*\.test\.ts/,
  // RDS tests
  /src\/__tests__\/rds-.*\.test\.ts/,
];

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
  region: AWS_REGIONS_TO_RUN_TESTS[jobIdx % AWS_REGIONS_TO_RUN_TESTS.length],
  os,
  tests: [],
  useParentAccount: false,
  runSolo,
});

const getTestNameFromPath = (testSuitePath: string): string => {
  const startIndex = testSuitePath.lastIndexOf('/') + 1;
  const endIndex = testSuitePath.lastIndexOf('.test');
  return testSuitePath.substring(startIndex, endIndex).split('.e2e').join('').split('.').join('-');
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

      const FORCE_REGION = Object.keys(FORCE_REGION_MAP).find((key) => {
        const testName = getTestNameFromPath(test);
        return testName.startsWith(key);
      });

      const USE_PARENT = USE_PARENT_ACCOUNT.some((usesParent) => test.startsWith(usesParent));

      if (RUN_SOLO.find((solo) => test === solo || test.match(solo))) {
        const newSoloJob = createJob(os, jobIdx, true);
        jobIdx++;
        newSoloJob.tests.push(test);
        if (FORCE_REGION) {
          newSoloJob.region = FORCE_REGION_MAP[FORCE_REGION as ForceTests];
        }
        if (USE_PARENT) {
          newSoloJob.useParentAccount = true;
        }
        soloJobs.push(newSoloJob);
        continue;
      }

      // add the test
      currentJob.tests.push(test);
      if (FORCE_REGION) {
        currentJob.region = FORCE_REGION_MAP[FORCE_REGION as ForceTests];
      }
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
      const names = j.tests.map((tn) => getTestNameFromPath(tn)).join('_');
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
