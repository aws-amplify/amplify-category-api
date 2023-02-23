import { $TSContext, AmplifySupportedService, AmplifyError } from 'amplify-cli-core';

export const getAppSyncApiResourceName = async (context: $TSContext): Promise<string> => {
  const { allResources } = await context.amplify.getResourceStatus();
  const apiResource = allResources.filter((resource: { service: string }) => resource.service === AmplifySupportedService.APPSYNC);
  let apiResourceName;

  if (apiResource.length > 0) {
    const resource = apiResource[0];
    apiResourceName = resource.resourceName;
  } else {
    throw new AmplifyError('NotImplementedError', {
      message: `${AmplifySupportedService.APPSYNC} API does not exist`,
      resolution: 'To add an api, use amplify add api',
    });
  }
  return apiResourceName;
};
