import * as path from 'path';
import * as fs from 'fs-extra';

export interface StackConfig {
  /**
   * The prefix to use when naming stack assets. Keep this short (<=15 characters) so you don't bump up against resource length limits
   * (e.g., 140 characters for lambda layers). Prefixes longer than 15 characters will be truncated.
   * arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
   */
  prefix: string;

  /**
   * If true, disable Cognito User Pool creation and only use API Key auth in sandbox mode.
   */
  useSandbox?: boolean;

  /**
   * If provided, use the provided Lambda Layer ARN instead of the default retrieved from the Lambda Layer version resolver. Suitable for
   * overriding the default layers during tests.
   */
  sqlLambdaLayerArn?: string;
}

export const writeStackConfig = (projRoot: string, stackConfig: StackConfig): void => {
  const filePath = path.join(projRoot, 'stack-config.json');
  fs.writeFileSync(filePath, JSON.stringify(stackConfig));
  console.log(`Wrote stack config to ${filePath}`);
};
