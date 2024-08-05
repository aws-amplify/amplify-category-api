import { $TSMeta, AmplifyCategories, AmplifySupportedService, pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import * as path from 'path';

export const authConfigHasApiKey = (authConfig?: any) => {
  if (!authConfig) {
    return false;
  }
  return (
    Array.of(authConfig.defaultAuthentication)
      .concat(authConfig.additionalAuthenticationProviders)
      .filter((auth) => !!auth) // filter out undefined elements which can happen if there are no addtl auth providers
      .map((auth) => auth.authenticationType)
      .findIndex((authType) => authType === 'API_KEY') > -1
  );
};

export const checkIfAuthExists = () => {
  const amplifyMeta = stateManager.getMeta();
  let authResourceName;
  const authServiceName = AmplifySupportedService.COGNITO;
  const authCategoryName = AmplifyCategories.AUTH;

  if (amplifyMeta[authCategoryName] && Object.keys(amplifyMeta[authCategoryName]).length > 0) {
    const categoryResources = amplifyMeta[authCategoryName];
    Object.keys(categoryResources).forEach((resource) => {
      if (categoryResources[resource].service === authServiceName) {
        authResourceName = resource;
      }
    });
  }

  return authResourceName;
};

export const getAppSyncAPINames = () => {
  return Object.entries(stateManager.getMeta()?.api || {})
    .filter(([_, apiResource]) => (apiResource as any).service === 'AppSync')
    .map(([name]) => name);
};

export const ensureNoAppSyncAPIExists = () => {
  const apiNames = getAppSyncAPINames();
  // This restriction of having a single AppSync API might change in future.
  if (apiNames?.length > 0) {
    throw new Error(
      `You already have an AppSync API named ${apiNames[0]} in your project. Use the "amplify update api" command to update your existing AppSync API.`,
    );
  }
};

export const getAppSyncAPIName = () => {
  const apiNames = getAppSyncAPINames();
  // This restriction of having a single AppSync API might change in future.
  if (apiNames?.length === 0) {
    throw new Error(`You do not have AppSync API added. Use "amplify add api" or "amplify import api" to add one to your project.`);
  }
  return apiNames[0];
};

export const getAPIResourceDir = (apiName: string) => {
  return path.join(pathManager.getBackendDirPath(), AmplifyCategories.API, apiName);
};

// some utility functions to extract the AppSync API name and config from amplify-meta

export const getAppSyncAuthConfig = (projectMeta: $TSMeta) => {
  const entry = getAppSyncAmplifyMetaEntry(projectMeta);
  if (entry) {
    const value = entry[1] as any;
    return value && value.output ? value.output.authConfig : {};
  }
};

export const getAppSyncResourceName = (projectMeta: $TSMeta): string | undefined => {
  const entry = getAppSyncAmplifyMetaEntry(projectMeta);
  if (entry) {
    return entry[0];
  }
};

// project meta is the contents of amplify-meta.json
// typically retreived using context.amplify.getProjectMeta()
const getAppSyncAmplifyMetaEntry = (projectMeta: $TSMeta) => {
  return Object.entries(projectMeta[AmplifyCategories.API] || {}).find(
    ([, value]) => (value as Record<string, any>).service === AmplifySupportedService.APPSYNC,
  );
};
