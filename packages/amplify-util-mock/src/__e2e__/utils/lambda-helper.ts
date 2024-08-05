import * as fs from 'fs-extra';
import * as path from 'path';

export function getFunctionDetails(fnName: string) {
  const lambdaFolder = path.join(__dirname, 'lambda_functions');
  if (!fs.existsSync(path.join(lambdaFolder, 'src', `${fnName}.js`))) {
    throw new Error(`Can not find lambda function ${fnName}`);
  }

  return {
    packageFolder: lambdaFolder,
    fileName: `${fnName}.js`,
    handler: 'handler',
  };
}
