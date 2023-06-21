import * as glob from 'glob';
import * as fs from 'fs-extra';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { migrationFromV10Tests, migrationFromV5Tests, migrationFromV6Tests } from './split-e2e-test-filters';
// Ensure to update packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts is also updated this gets updated
const AWS_REGIONS_TO_RUN_TESTS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2',
];
// Some services (eg. amazon lex, containers) are not available in all regions
// Tests added to this list will always run in the specified region
const FORCE_REGION_MAP = {
  'interactions': 'us-west-2',
  'containers': 'us-east-1',
}
type FORCE_TESTS = 'interactions' | 'containers';
// some tests require additional time, the parent account can handle longer tests (up to 90 minutes)
const USE_PARENT_ACCOUNT = [
  'src/__tests__/transformer-migrations/searchable-migration',
  'src/__tests__/graphql-v2/searchable-datastore',
  'src/__tests__/schema-searchable',
  'src/__tests__/migration/api.key.migration2.test.ts',
  'src/__tests__/migration/api.key.migration3.test.ts',
  'src/__tests__/migration/api.key.migration4.test.ts',
  'src/__tests__/migration/api.key.migration5.test.ts',
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts'
];
const REPO_ROOT = join(__dirname, '..');
const TEST_TIMINGS_PATH = join(REPO_ROOT, 'scripts', 'cci', 'test-timings.data.json');
const CODEBUILD_CONFIG_BASE_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow_base.yml');
const CODEBUILD_GENERATE_CONFIG_PATH = join(REPO_ROOT, 'codebuild_specs', 'e2e_workflow.yml');
const RUN_SOLO = [
  'src/__tests__/apigw.test.ts',
  'src/__tests__/api_2.test.ts',
  'src/__tests__/containers-api-1.test.ts',
  'src/__tests__/containers-api-2.test.ts',
  'src/__tests__/graphql-v2/searchable-datastore.test.ts',
  'src/__tests__/migration/api.key.migration1.test.ts',
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
  'src/__tests__/schema-iterative-update-4.test.ts',
  'src/__tests__/schema-iterative-update-5.test.ts',
  'src/__tests__/schema-model.test.ts',
  'src/__tests__/schema-key.test.ts',
  'src/__tests__/schema-connection.test.ts',
  'src/__tests__/transformer-migrations/function-migration.test.ts',
  'src/__tests__/transformer-migrations/searchable-migration.test.ts',
  "src/__tests__/transformer-migrations/model-migration.test.ts",
  'src/__tests__/graphql-v2/searchable-node-to-node-encryption/searchable-previous-deployment-no-node-to-node.test.ts',
  'src/__tests__/graphql-v2/searchable-node-to-node-encryption/searchable-previous-deployment-had-node-to-node.test.ts',
  // GrapQL E2E tests
  'src/__tests__/FunctionTransformerTestsV2.e2e.test.ts',
  'src/__tests__/HttpTransformer.e2e.test.ts',
  'src/__tests__/HttpTransformerV2.e2e.test.ts',
];

export function loadConfigBase() {
  return yaml.load(fs.readFileSync(CODEBUILD_CONFIG_BASE_PATH, 'utf8'));
}
export function saveConfig(config: any): void {
  const output = ['# auto generated file. DO NOT EDIT manually', yaml.dump(config, { noRefs: true })];
  fs.writeFileSync(CODEBUILD_GENERATE_CONFIG_PATH, output.join('\n'));
}
export function loadTestTimings(): { timingData: { test: string; medianRuntime: number }[] } {
  return JSON.parse(fs.readFileSync(TEST_TIMINGS_PATH, 'utf-8'));
}
function getTestFiles(dir: string, pattern = 'src/**/*.test.ts'): string[] {
  return glob.sync(pattern, { cwd: dir });
}
type COMPUTE_TYPE = 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_LARGE';
type BatchBuildJob = {
  identifier: string;
  env: {
    'compute-type': COMPUTE_TYPE;
    variables: [string: string];
  };
};
type ConfigBase = {
  batch: {
    'build-graph': BatchBuildJob[];
    'fast-fail': boolean;
  };
  env: {
    'compute-type': COMPUTE_TYPE;
    shell: 'bash';
    variables: [string: string];
  };
};
const MAX_WORKERS = 4;
type OS_TYPE = 'w' | 'l';
type CandidateJob = {
  region: string;
  os: OS_TYPE;
  tests: string[];
  useParentAccount: boolean;
  runSolo: boolean;
};
const createJob = (os: OS_TYPE, jobIdx: number, runSolo: boolean = false): CandidateJob => {
  const region = AWS_REGIONS_TO_RUN_TESTS[jobIdx % AWS_REGIONS_TO_RUN_TESTS.length];
  return {
    region,
    os,
    tests: [],
    useParentAccount: false,
    runSolo,
  };
};
const getTestNameFromPath = (testSuitePath: string): string => {
  const startIndex = testSuitePath.lastIndexOf('/') + 1;
  const endIndex = testSuitePath.lastIndexOf('.test');
  return testSuitePath
    .substring(startIndex, endIndex)
    .split('.e2e')
    .join('')
    .split('.')
    .join('-');
};
const splitTests = (
  baseJobLinux: any,
  testDirectory: string,
  isMigration: boolean,
  pickTests?: ((testSuites: string[]) => string[]),
) => {
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
    const runtimeA = testFileRunTimes.find((t:any) => t.test === a)?.medianRuntime ?? 30;
    const runtimeB = testFileRunTimes.find((t:any) => t.test === b)?.medianRuntime ?? 30;
    return runtimeA - runtimeB;
  });
  const generateJobsForOS = (os: OS_TYPE) => {
    const soloJobs = [];
    let jobIdx = 0;
    const osJobs = [createJob(os, jobIdx)];
    jobIdx++;
    for (let test of testSuites) {
      const currentJob = osJobs[osJobs.length - 1];

      const FORCE_REGION = Object.keys(FORCE_REGION_MAP).find(key => {
        const testName = getTestNameFromPath(test);
        return testName.startsWith(key);
      });

      const USE_PARENT = USE_PARENT_ACCOUNT.some((usesParent) => test.startsWith(usesParent));

      if (isMigration || RUN_SOLO.find((solo) => test === solo)) {
        const newSoloJob = createJob(os, jobIdx, true);
        jobIdx++;
        newSoloJob.tests.push(test);
        if (FORCE_REGION) {
          newSoloJob.region = FORCE_REGION_MAP[FORCE_REGION as FORCE_TESTS];
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
        currentJob.region = FORCE_REGION_MAP[FORCE_REGION as FORCE_TESTS];
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
  const getIdentifier = (os: string, names: string) => {
    let jobName = `${names.replace(/-/g, '_')}`.substring(0, 127);
    if (isMigration) {
      const startIndex = baseJobLinux.identifier.lastIndexOf('_');
      jobName = jobName + baseJobLinux.identifier.substring(startIndex);
    }
    return jobName;
  };
  const result: any[] = [];
  linuxJobs.forEach((j) => {
    if (j.tests.length !== 0) {
      const names = j.tests.map((tn) => getTestNameFromPath(tn)).join('_');
      const tmp = {
        ...JSON.parse(JSON.stringify(baseJobLinux)), // deep clone base job
        identifier: getIdentifier(j.os, names),
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
function main(): void {
  const configBase: any = loadConfigBase();
  const baseBuildGraph = configBase.batch['build-graph'];
  const splitE2ETests = splitTests(
    {
      identifier: 'run_e2e_tests',
      buildspec: 'codebuild_specs/run_e2e_tests.yml',
      env: {
        'compute-type': 'BUILD_GENERAL1_MEDIUM',
      },
      'depend-on': ['publish_to_local_registry'],
    },
    join(REPO_ROOT, 'packages', 'amplify-e2e-tests'),
    false
  );
  const splitGqlTests = splitTests(
    {
      identifier: 'gql_e2e_tests',
      buildspec: 'codebuild_specs/graphql_e2e_tests.yml',
      env: {
        'compute-type': 'BUILD_GENERAL1_MEDIUM',
      },
      'depend-on': ['publish_to_local_registry'],
    },
    join(REPO_ROOT, 'packages', 'graphql-transformers-e2e-tests'),
    false
  );
  const splitMigrationV5Tests = splitTests(
    {
      identifier: 'migration_tests_v5',
      buildspec: 'codebuild_specs/migration_tests_v5.yml',
      env: {
        'compute-type': 'BUILD_GENERAL1_SMALL',
      },
      'depend-on': ['publish_to_local_registry'],
    },
    join(REPO_ROOT, 'packages', 'amplify-migration-tests'),
    true,
    (tests: string[]) => {
      return tests.filter((testName) => migrationFromV5Tests.find((t) => t === testName));
    },
  );
  const splitMigrationV6Tests = splitTests(
    {
      identifier: 'migration_tests_v6',
      buildspec: 'codebuild_specs/migration_tests_v6.yml',
      env: {
        'compute-type': 'BUILD_GENERAL1_SMALL',
      },
      'depend-on': ['publish_to_local_registry'],
    },
    join(REPO_ROOT, 'packages', 'amplify-migration-tests'),
    true,
    (tests: string[]) => {
      return tests.filter((testName) => migrationFromV6Tests.find((t) => t === testName));
    },
  );
  const splitMigrationV10Tests = splitTests(
    {
      identifier: 'migration_tests_v10',
      buildspec: 'codebuild_specs/migration_tests_v10.yml',
      env: {
        'compute-type': 'BUILD_GENERAL1_SMALL',
      },
      'depend-on': ['publish_to_local_registry'],
    },
    join(REPO_ROOT, 'packages', 'amplify-migration-tests'),
    true,
    (tests: string[]) => {
      return tests.filter((testName) => migrationFromV10Tests.find((t) => t === testName));
    },
  );
  let allBuilds = [...splitE2ETests,...splitGqlTests, ...splitMigrationV5Tests, ...splitMigrationV6Tests, ...splitMigrationV10Tests];
  const cleanupResources = {
    identifier: 'cleanup_e2e_resources',
    buildspec: 'codebuild_specs/cleanup_e2e_resources.yml',
    env: {
      'compute-type': 'BUILD_GENERAL1_SMALL'
    },
    'depend-on': [allBuilds[0].identifier]
  }
  console.log(`Total number of splitted jobs: ${allBuilds.length}`)
  let currentBatch = [...baseBuildGraph, ...allBuilds, cleanupResources];
  configBase.batch['build-graph'] = currentBatch;
  saveConfig(configBase);
}
main();