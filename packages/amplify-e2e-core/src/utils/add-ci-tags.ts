import { stateManager } from '@aws-amplify/amplify-cli-core';

declare global {
  namespace NodeJS {
    interface Global {
      getTestName?: () => string;
      getHookName?: () => string;
      getDescibeBlocks?: () => string[];
    }
  }
}

export const addCITags = (projectPath: string): void => {
  if (process.env && process.env['CODEBUILD']) {
    addCodeBuildCITags(projectPath);
  }
};

/**
 * Add CI tags for code build
 * Refer https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html
 * @param projectPath
 */
const addCodeBuildCITags = (projectPath: string): void => {
  const tags = stateManager.getProjectTags(projectPath);

  const addTagIfNotExist = (key: string, value: string): void => {
    if (!tags.find((t) => t.Key === key)) {
      tags.push({
        Key: key,
        Value: value,
      });
    }
  };

  addTagIfNotExist('codebuild', sanitizeTagValue(process.env['CODEBUILD'] || 'N/A'));
  addTagIfNotExist('codebuild:batch_build_identifier', sanitizeTagValue(process.env['CODEBUILD_BATCH_BUILD_IDENTIFIER'] || 'N/A'));
  addTagIfNotExist('codebuild:build_id', sanitizeTagValue(process.env['CODEBUILD_BUILD_ID'] || 'N/A'));
  // exposed by custom CLI test environment
  if (global.getTestName) {
    addTagIfNotExist('jest:test_name', sanitizeTagValue(global.getTestName().substr(0, 255) || 'N/A'));
  }
  if (global.getHookName) {
    addTagIfNotExist('jest:hook_name', sanitizeTagValue(global.getHookName().substr(0, 255) || 'N/A'));
  }
  if (global.getDescibeBlocks) {
    global.getDescibeBlocks().forEach((blockName, i) => {
      addTagIfNotExist(`jest:describe_${i + 1}`, sanitizeTagValue(blockName.substr(0, 255) || 'N/A'));
    });
  }

  stateManager.setProjectFileTags(projectPath, tags);
};

export function sanitizeTagValue(value: string): string {
  return value.replace(/[^ a-z0-9_.:/=+\-@]/gi, '');
}
