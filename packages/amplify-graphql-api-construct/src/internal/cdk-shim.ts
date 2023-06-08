import { Template } from '@aws-amplify/graphql-transformer-interfaces';
import * as cfninclude from 'aws-cdk-lib/cloudformation-include';
import * as fs from 'fs-extra';
import * as path from 'path';

const ROOT_STACK_FILE_NAME = 'RootStack.json';
const STACKS_DIRECTORY = 'stacks';

export type PersistStackAssetsProps = {
  assetDir: string;
  rootStack: Template;
  stacks: Record<string, Template>;
};

export type NestedStackConfig = {
  [stackName: string]: cfninclude.CfnIncludeProps;
};

export type PersistedStackResults = {
  rootTemplateFile: string;
  nestedStackConfig: NestedStackConfig;
};

const cleanupGeneratedCDKMetadata = (stack: Template): void => {
  if (stack && stack.Resources && stack.Resources.CDKMetadata) {
    // eslint-disable-next-line no-param-reassign
    delete stack.Resources.CDKMetadata;
  }
  if (stack && stack.Resources && stack.Resources.CDKMetadataAvailable) {
    // eslint-disable-next-line no-param-reassign
    delete stack.Resources.CDKMetadataAvailable;
  }
};

/**
 * Write stack assets to disk, and convert into CfnIncludeProps.
 */
export const persistStackAssets = ({ assetDir, rootStack, stacks }: PersistStackAssetsProps): PersistedStackResults => {
  const stackDir = fs.mkdtempSync(path.join(assetDir, STACKS_DIRECTORY));

  // Write the root stack and nested stacks to the temp directory.
  cleanupGeneratedCDKMetadata(rootStack);
  const rootTemplateFile = path.join(stackDir, ROOT_STACK_FILE_NAME);
  fs.writeFileSync(rootTemplateFile, JSON.stringify(rootStack));

  const nestedStackConfig: NestedStackConfig = Object.fromEntries(Object.entries(stacks)
    .map(([stackName, stack]) => {
      cleanupGeneratedCDKMetadata(stack);
      const templateFile = path.join(stackDir, stackName);
      fs.writeFileSync(templateFile, JSON.stringify(stack));
      return [stackName, { templateFile }];
    }));

  return { rootTemplateFile, nestedStackConfig };
};
