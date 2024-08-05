import { JSONUtilities } from '@aws-amplify/amplify-cli-core';
import * as path from 'path';

export function getMockConfig(context) {
  const { projectPath } = context.amplify.getEnvInfo();
  const mockConfigPath = path.join(projectPath, 'amplify', 'mock.json');
  return JSONUtilities.readJson<any>(mockConfigPath, { throwIfNotExist: false }) ?? {};
}
