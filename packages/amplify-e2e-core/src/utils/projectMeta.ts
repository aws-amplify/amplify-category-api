/* eslint-disable */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import _ from 'lodash';
import { JSONUtilities } from '@aws-amplify/amplify-cli-core';

function getAWSConfigAndroidPath(projRoot: string): string {
  return path.join(projRoot, 'app', 'src', 'main', 'res', 'raw', 'awsconfiguration.json');
}

function getAmplifyConfigIOSPath(projRoot: string): string {
  return path.join(projRoot, 'amplifyconfiguration.json');
}

function getAmplifyConfigFlutterPath(projRoot: string): string {
  return path.join(projRoot, 'lib', 'amplifyconfiguration.dart');
}

function getAWSConfigIOSPath(projRoot: string): string {
  return path.join(projRoot, 'awsconfiguration.json');
}

function getProjectMeta(projectRoot: string) {
  const metaFilePath: string = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
  return JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
}
function getCustomPoliciesPath(projectRoot: string, category: string, resourceName: string): string {
  return path.join(projectRoot, 'amplify', 'backend', category, resourceName, 'custom-policies.json');
}

function getProjectTags(projectRoot: string) {
  const projectTagsFilePath: string = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'tags.json');
  return JSON.parse(fs.readFileSync(projectTagsFilePath, 'utf8'));
}

function getBackendAmplifyMeta(projectRoot: string) {
  const metaFilePath: string = path.join(projectRoot, 'amplify', 'backend', 'amplify-meta.json');
  return JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
}

function getBackendConfig(projectRoot: string) {
  const backendFConfigFilePath: string = path.join(projectRoot, 'amplify', 'backend', 'backend-config.json');
  return JSON.parse(fs.readFileSync(backendFConfigFilePath, 'utf8'));
}

function getLocalEnvInfo(projectRoot: string) {
  const localEnvInfoFilePath: string = path.join(projectRoot, 'amplify', '.config', 'local-env-info.json');
  return JSON.parse(fs.readFileSync(localEnvInfoFilePath, 'utf8'));
}

function getTeamProviderInfo(projectRoot: string) {
  const teamProviderFilePath: string = path.join(projectRoot, 'amplify', 'team-provider-info.json');
  return JSON.parse(fs.readFileSync(teamProviderFilePath, 'utf8'));
}

function getAwsAndroidConfig(projectRoot: string): any {
  const configPath = getAWSConfigAndroidPath(projectRoot);
  return JSONUtilities.readJson(configPath);
}

function getAwsIOSConfig(projectRoot: string): any {
  const configPath = getAWSConfigIOSPath(projectRoot);
  return JSONUtilities.readJson(configPath);
}

function getAmplifyIOSConfig(projectRoot: string): any {
  const configPath = getAmplifyConfigIOSPath(projectRoot);
  return JSONUtilities.readJson(configPath);
}

function getAmplifyFlutterConfig(projectRoot: string): any {
  const configPath = getAmplifyConfigFlutterPath(projectRoot);
  const dartFile = fs.readFileSync(configPath);
  return JSON.parse(dartFile.toString().split(/'''/)[1]);
}

function getDeploymentSecrets(): any {
  const deploymentSecretsPath: string = path.join(os.homedir(), '.aws', 'amplify', 'deployment-secrets.json');
  return (
    JSONUtilities.readJson(deploymentSecretsPath, {
      throwIfNotExist: false,
    }) || { appSecrets: [] }
  );
}

export {
  getProjectMeta,
  getProjectTags,
  getAmplifyFlutterConfig,
  getBackendAmplifyMeta,
  getAwsAndroidConfig,
  getAwsIOSConfig,
  getAmplifyIOSConfig,
  getAmplifyConfigFlutterPath,
  getAWSConfigAndroidPath,
  getAmplifyConfigIOSPath,
  getAWSConfigIOSPath,
  getDeploymentSecrets,
  getBackendConfig,
  getTeamProviderInfo,
  getLocalEnvInfo,
  getCustomPoliciesPath,
};
/* eslint-enable */
