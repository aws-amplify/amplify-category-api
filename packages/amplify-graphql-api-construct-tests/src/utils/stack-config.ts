import * as path from 'path';
import * as fs from 'fs';
import { AuthorizationModes } from '@aws-amplify/graphql-api-construct';
import { TestRoleProps } from './test-role-props';

/**
 * Controls stack-level configurations. TODO: Move TestDefinitions into this structure so we can stop writing so many files.
 */
interface StackConfig {
  /**
   * Test-defined authorization mode settings. These will be applied to the final stack authorization configuration. If a field is present
   * in this structure, it will override the default supplied by the configurable stack.
   *
   * **NOTE:** Not consumed by every test stack. Check the source to ensure compatibility
   */
  partialAuthorizationModes?: Partial<AuthorizationModes>;

  /**
   * The prefix to use when naming stack assets. Keep this short (<=15 characters) so you don't bump up against resource length limits
   * (e.g., 140 characters for lambda layers). Prefixes longer than 15 characters will be truncated.
   * arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
   */
  prefix: string;

  /**
   * If provided, use the provided Lambda Layer ARN instead of the default retrieved from the Lambda Layer version resolver. Suitable for
   * overriding the default layers during tests.
   */
  sqlLambdaLayerArn?: string;

  /**
   * If present, these props will be used to create an IAM role. Be default, the role will be assumable by the current test account.
   *
   * **NOTE:** Not consumed by every test stack. Check the source to ensure compatibility
   */
  testRoleProps?: TestRoleProps;

  /**
   * If true, disable Cognito User Pool creation and only use API Key auth in sandbox mode.
   */
  useSandbox?: boolean;
}

export const writeStackConfig = (projRoot: string, stackConfig: StackConfig): void => {
  const filePath = path.join(projRoot, 'stack-config.json');
  fs.writeFileSync(filePath, JSON.stringify(stackConfig));
  console.log(`Wrote stack config to ${filePath}`);
};
