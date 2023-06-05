import * as path from 'path';
import * as fs from 'fs-extra';
import { TRANSFORM_CONFIG_FILE_NAME } from 'graphql-transformer-core';
import { addFeatureFlag } from './feature-flags';

/**
 *
 * @param projectDir
 * @param projectName
 * @param schemaText
 */
export function updateSchema(projectDir: string, projectName: string, schemaText: string) {
  const schemaPath = path.join(projectDir, 'amplify', 'backend', 'api', projectName, 'schema.graphql');
  fs.writeFileSync(schemaPath, schemaText);
}

/**
 *
 * @param projectDir
 * @param projectName
 * @param config
 */
export function updateConfig(projectDir: string, projectName: string, config: any = {}) {
  const configPath = path.join(projectDir, 'amplify', 'backend', 'api', projectName, TRANSFORM_CONFIG_FILE_NAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

/**
 *
 * @param projectDir
 * @param apiName
 * @param config
 */
export function setCustomRolesConfig(projectDir: string, apiName: string, config: any = {}) {
  const configPath = path.join(projectDir, 'amplify', 'backend', 'api', apiName, 'custom-roles.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 *
 * @param projectDir
 * @param apiName
 * @param resolverName
 * @param resolver
 */
export function addCustomResolver(projectDir: string, apiName: string, resolverName: string, resolver: string) {
  const resolverPath = path.join(projectDir, 'amplify', 'backend', 'api', apiName, 'resolvers', resolverName);
  fs.writeFileSync(resolverPath, resolver);
}

/**
 *
 * @param projectDir
 * @param apiName
 * @param json
 */
export function writeToCustomResourcesJson(projectDir: string, apiName: string, json?: Object) {
  const jsonPath = path.join(projectDir, 'amplify', 'backend', 'api', apiName, 'stacks', 'CustomResources.json');
  const customResourceJson = JSON.parse(fs.readFileSync(jsonPath).toString());
  const mergedJson = { ...customResourceJson, ...json };
  fs.writeFileSync(jsonPath, JSON.stringify(mergedJson));
}

/**
 *
 * @param cwd
 * @param transformerVersion
 */
export function setTransformerVersionFlag(cwd: string, transformerVersion: number) {
  if (transformerVersion === 1) {
    addFeatureFlag(cwd, 'graphqltransformer', 'transformerVersion', 1);
    addFeatureFlag(cwd, 'graphqltransformer', 'useExperimentalPipelinedTransformer', false);
  }
}
