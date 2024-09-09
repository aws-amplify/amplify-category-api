import path from 'path';
import * as fs from 'fs-extra';
import { SqlEngine } from 'amplify-category-api-e2e-core';

export const getClusterIdFromLocalConfig = (region: string, engine: SqlEngine): string | undefined => {
  const repoRoot = path.join(__dirname, '..', '..', '..', '..');
  const localClusterPath = path.join(repoRoot, 'scripts', 'e2e-test-local-cluster-config.json');
  if (!fs.existsSync(localClusterPath)) {
    return;
  }
  try {
    const localClustersObject = JSON.parse(fs.readFileSync(localClusterPath, 'utf-8'));
    const regionObject = localClustersObject[region];
    if (!regionObject || regionObject?.length === 0) {
      return;
    }

    const clusterConfig = regionObject[0]?.dbConfig;
    if (!clusterConfig || !clusterConfig.engine) {
      return;
    }
    // Get the config identifier and connection URI
    const identifier = clusterConfig.identifier;
    return identifier;
  } catch (err) {
    // cannot get local cluster information
    return;
  }
};
