import path from 'path';
import { existsSync, PathLike, rmSync, lstatSync } from 'fs';
import cypress from 'cypress';
import { setup, teardown } from 'jest-dev-server';
import { AmplifyCLI } from './amplifyCLI';
import { SpawndChildProcess } from 'spawnd';

jest.setTimeout(20 * 60 * 1000); // 20 minutes

enum TestExecutionStage {
  SETUP,
  CYPRESS_EXECUTE,
  CYPRESS_WATCH,
  TEARDOWN,
};

/**
 * Read the test config from environment variable. Defaults to all stages if not defined.
 * @returns the set of test stages to execute
 */
const getTestExecutionStages = (): Set<TestExecutionStage> => {
  switch(process.env.TEST_HARNESS_STAGE) {
    case 'setup':
      return new Set([TestExecutionStage.SETUP]);
    case 'execute':
      return new Set([TestExecutionStage.CYPRESS_EXECUTE]);
    case 'watch':
      return new Set([TestExecutionStage.CYPRESS_WATCH]);
    case 'teardown':
      return new Set([TestExecutionStage.TEARDOWN]);
    default:
      return new Set([TestExecutionStage.SETUP, TestExecutionStage.CYPRESS_EXECUTE, TestExecutionStage.TEARDOWN]);
    }
};

/**
 * Try and clean up a path if it is defined, works for files or directories
 * @param path the path to remove
 */
const deleteIfExists = (path: PathLike) => {
  if (existsSync(path)) {
    const recursive = lstatSync(path).isDirectory();
    rmSync(path, { recursive })
  }
};

/**
 * Clean up the common generated files for a JS amplify project.
 * @param projectRoot the root of the project (where your `amplify` directory will exist)
 */
const cleanupJSGeneratedFiles = (projectRoot: string) => {
  [
    ['amplify'],
    ['.graphqlconfig.yml'],
    ['src', 'graphql'],
    ['src', 'API.ts'],
    ['src', 'aws-exports.js'],
  ].map(it => path.join(projectRoot, ...it)).forEach(deleteIfExists);
};

export const executeAmplifyTestHarness = (testName: string, projectRoot: string, setupApp: (cli: AmplifyCLI) => Promise<void>) => {
  let serverProcs: SpawndChildProcess[] | undefined;

  describe(testName, () => {
    const cli = new AmplifyCLI(projectRoot);

    /**
     * Set up and deploy amplify project, start local webserver.
     */
    beforeAll(async () => {
      if (getTestExecutionStages().has(TestExecutionStage.SETUP)) {
        cleanupJSGeneratedFiles(projectRoot);
        await setupApp(cli);
      }

      if (getTestExecutionStages().has(TestExecutionStage.CYPRESS_EXECUTE) || getTestExecutionStages().has(TestExecutionStage.CYPRESS_WATCH)) {
        serverProcs = await setup({
          command: `yarn start`,
          launchTimeout: 5 * 60 * 1000,
          host: '127.0.0.1',
          port: 3000,
        });
      }
    });
  
    /**
     * Tear down project resources.
     */
    afterAll(async () => {
      if (getTestExecutionStages().has(TestExecutionStage.TEARDOWN)) {
        try {
          await cli.delete();
          cleanupJSGeneratedFiles(projectRoot);
        } catch (e) {}
      }
  
      if (getTestExecutionStages().has(TestExecutionStage.CYPRESS_EXECUTE) || getTestExecutionStages().has(TestExecutionStage.CYPRESS_WATCH)) {
        if (serverProcs) {
          await teardown(serverProcs);
        }
      }
    });
  
    /**
     * Invoke actual cypress suite, we require all cypress tests to pass by default.
     */
    if (getTestExecutionStages().has(TestExecutionStage.CYPRESS_EXECUTE)) {
        it('executes the cypress suite', async () => {
        const runResult = await cypress.run({
          reporter: 'junit',
          browser: 'electron',
          reporterOptions: {
            mochaFile: 'test-results/cypress-test-results-[hash].xml'
          },
          config: {
            video: true,
            watchForFileChanges: false
          },
        })
        expect(runResult.status).toEqual('finished');
        expect((runResult as any).totalFailed).toEqual(0);
      });
    } else if (getTestExecutionStages().has(TestExecutionStage.CYPRESS_WATCH)) {
      it('opens cypress', async () => {
        await cypress.open();
      });
    } else {
      it('executes a no-op', () => { /* No-op */ });
    }
  });
};
