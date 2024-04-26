import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Write the prefix to use when naming stack assets. Keep this short (<=15 characters) so you don't bump up against resource length limits
 * (e.g., 140 characters for lambda layers). Prefixes longer than 15 characters will be truncated.
 *
 * An example of a resource at risk of exceeding length limits is the Lambda layer:
 * - `arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1`
 */
export const writeStackPrefix = (prefix: string, projRoot: string): void => {
  const filePath = path.join(projRoot, 'stack-prefix.txt');
  fs.writeFileSync(filePath, prefix.substring(0, 15));
  console.log(`Wrote stack prefix to ${filePath}`);
};
