import { Writable } from 'stream';
import { v4 as uuid } from 'uuid';
import {
  amplifyPull,
  amplifyPushWithoutCodegen,
  cliInputsExists,
  createNewProjectDir,
  deleteProjectDir,
  getAppId,
  getBackendConfig,
  getCLIInputs,
  getParameters,
  getCloudFormationTemplate,
  parametersExists,
} from 'amplify-category-api-e2e-core';
import * as cfnDiff from '@aws-cdk/cloudformation-diff';
import stripAnsi = require('strip-ansi');

/**
 * generates a random string
 */
export const getShortId = (): string => {
  const [shortId] = uuid().split('-');

  return shortId;
};

/**
 * Given the parameter objects of each project for the provided category & resource key,
 * you can modify the parameter objects before the diff is performed.
 *
 * You can use conditional logic to delete attributes on the parameter objects before they are diffed, if
 * you want to exclude those attributes from the comparison. Make sure to return the modified objects
 * that you want to be diffed.
 */
export type ExcludeFromParameterDiff = (
  currentCategory: string,
  currentResourceKey: string,
  parameters: {
    project1: any;
    project2: any;
  },
) => { project1: any; project2: any };

/**
 * Asserts that parameters between two project directories didn't drift.
 */
export const assertNoParameterChangesBetweenProjects = (
  projectRoot1: string,
  projectRoot2: string,
  options?: {
    excludeFromParameterDiff?: ExcludeFromParameterDiff;
  },
): void => {
  const backendConfig1 = getBackendConfig(projectRoot1);
  const backendConfig2 = getBackendConfig(projectRoot2);
  expect(backendConfig2).toMatchObject(backendConfig1);
  for (const categoryKey of Object.keys(backendConfig1)) {
    const category = backendConfig1[categoryKey];
    for (const resourceKey of Object.keys(category)) {
      if (cliInputsExists(projectRoot1, categoryKey, resourceKey)) {
        const cliInputs1 = getCLIInputs(projectRoot1, categoryKey, resourceKey);
        const cliInputs2 = getCLIInputs(projectRoot2, categoryKey, resourceKey);
        expect(cliInputs1).toEqual(cliInputs2);
      }
      if (parametersExists(projectRoot1, categoryKey, resourceKey)) {
        let parameters1 = getParameters(projectRoot1, categoryKey, resourceKey);
        let parameters2 = getParameters(projectRoot2, categoryKey, resourceKey);
        if (options && options.excludeFromParameterDiff) {
          const afterExclusions = options.excludeFromParameterDiff(categoryKey, resourceKey, {
            project1: parameters1,
            project2: parameters2,
          });
          parameters1 = afterExclusions.project1;
          parameters2 = afterExclusions.project2;
        }
        expect(parameters1).toEqual(parameters2);
      }
    }
  }
};

class InMemoryWritable extends Writable {
  private payload = '';

  _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (chunk) {
      this.payload += chunk.toString();
    }
    callback();
  }

  toString(): string {
    return this.payload;
  }
}

/**
 * Given the CFN templates of each project for the provided category & resource key,
 * you can modify the CFN templates objects before the diff is performed.
 *
 * You can use conditional logic to delete attributes on the CFN object before they are diffed, if
 * you want to exclude those attributes from the comparison. Make sure to return the modified objects
 * that you want to be diffed.
 */
export type ExcludeFromCFNDiff = (
  currentCategory: string,
  currentResourceKey: string,
  cfnTemplates: {
    project1: any;
    project2: any;
  },
) => { project1: any; project2: any };

/**
 * Collects all differences between cloud formation templates into a single string.
 */
export const collectCloudformationDiffBetweenProjects = (
  projectRoot1: string,
  projectRoot2: string,
  excludeFn?: ExcludeFromCFNDiff,
): string => {
  const backendConfig1 = getBackendConfig(projectRoot1);
  const backendConfig2 = getBackendConfig(projectRoot2);
  expect(backendConfig2).toMatchObject(backendConfig1);
  const stream = new InMemoryWritable();
  for (const categoryKey of Object.keys(backendConfig1)) {
    const category = backendConfig1[categoryKey];
    for (const resourceKey of Object.keys(category)) {
      let template1 = getCloudFormationTemplate(projectRoot1, categoryKey, resourceKey);
      let template2 = getCloudFormationTemplate(projectRoot2, categoryKey, resourceKey);

      // Description does not matter much and it can contain os/runtime specific words.
      delete template1.Description;
      delete template2.Description;

      if (excludeFn) {
        const afterExclusions = excludeFn(categoryKey, resourceKey, { project1: template1, project2: template2 });
        template1 = afterExclusions.project1;
        template2 = afterExclusions.project2;
      }

      const templateDiff = cfnDiff.diffTemplate(template1, template2);
      if (!templateDiff.isEmpty) {
        cfnDiff.formatDifferences(stream, templateDiff);
      }
    }
  }
  return stripAnsi(stream.toString());
};

/**
 * Pulls and pushes project with latest codebase. Validates parameter and cfn drift.
 */
export const pullPushWithLatestCodebaseValidateParameterAndCfnDrift = async (projRoot: string, projName: string): Promise<void> => {
  const appId = getAppId(projRoot);
  expect(appId).toBeDefined();
  const projRoot2 = await createNewProjectDir(`${projName}2`);
  try {
    await amplifyPull(projRoot2, { emptyDir: true, appId }, true);
    assertNoParameterChangesBetweenProjects(projRoot, projRoot2);
    expect(collectCloudformationDiffBetweenProjects(projRoot, projRoot2)).toMatchSnapshot();
    await amplifyPushWithoutCodegen(projRoot2, true);
    assertNoParameterChangesBetweenProjects(projRoot, projRoot2);
    expect(collectCloudformationDiffBetweenProjects(projRoot, projRoot2)).toMatchSnapshot();
  } finally {
    deleteProjectDir(projRoot2);
  }
};
