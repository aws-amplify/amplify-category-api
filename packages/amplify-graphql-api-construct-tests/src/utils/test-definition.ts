import * as path from 'path';
import * as fs from 'fs-extra';
import { ModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct';

export interface TestDefinition {
  schema: string;
  strategy: ModelDataSourceStrategy;
}

/**
 * Writes the specified test definitions to a file named `${key}.test-definition.json` in the specified directory. Used to pass a schema
 * file from setup code to the CDK app under test.
 *
 * **NOTE** Do not call this until the CDK project is initialized: `cdk init` fails if the working directory is not empty.
 *
 * @param testDefinitions the definitions to serialize and write
 * @param projRoot the destination directory to write to
 */
export const writeTestDefinitions = (testDefinitions: Record<string, TestDefinition>, projRoot: string): void => {
  Object.entries(testDefinitions).forEach(([key, testDefinition]) => {
    const filePath = path.join(projRoot, `${key}.test-definition.json`);
    const content = JSON.stringify(testDefinition);
    fs.writeFileSync(filePath, content);
    console.log(`Wrote test definition to ${filePath}`);
  });
};

/**
  * Write the prefix to use when naming stack assets. Keep this short so you don't bump up against resource length limits (e.g., 140
  * characters for lambda layers).
  * arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
  */
export const writeStackPrefix = (prefix: string, projRoot: string): void => {
  const filePath = path.join(projRoot, 'stack-prefix.txt');
  fs.writeFileSync(filePath, prefix);
  console.log(`Wrote stack prefix to ${filePath}`);
};
