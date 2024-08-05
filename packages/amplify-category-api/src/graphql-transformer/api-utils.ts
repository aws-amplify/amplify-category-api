import {
  $TSContext,
  AmplifyCategories,
  ApiCategoryFacade,
  getGraphQLTransformerOpenSearchProductionDocLink,
} from '@aws-amplify/amplify-cli-core';
import { ensureEnvParamManager } from '@aws-amplify/amplify-environment-parameters';
import { printer } from '@aws-amplify/amplify-prompts';
import { ResourceConstants } from 'graphql-transformer-common';

export async function searchablePushChecks(context: $TSContext, map: Record<string, any>, apiName: string): Promise<void> {
  const searchableModelTypes = Object.keys(map).filter((type) => map[type].includes('searchable') && map[type].includes('model'));
  if (searchableModelTypes.length) {
    const apiParameterManager = (await ensureEnvParamManager()).instance.getResourceParamManager(AmplifyCategories.API, apiName);
    const getInstanceType = (instanceTypeParam: string) => apiParameterManager.getParam(instanceTypeParam);
    const instanceType =
      getInstanceType(ResourceConstants.PARAMETERS.OpenSearchInstanceType) ??
      getInstanceType(ResourceConstants.PARAMETERS.ElasticsearchInstanceType) ??
      't2.small.elasticsearch';
    if (instanceType === 't2.small.elasticsearch' || instanceType === 't3.small.elasticsearch') {
      const version = await ApiCategoryFacade.getTransformerVersion(context);
      const docLink = getGraphQLTransformerOpenSearchProductionDocLink(version);
      printer.warn(
        `Your instance type for OpenSearch is ${instanceType}, you may experience performance issues or data loss. Consider reconfiguring with the instructions here ${docLink}`,
      );
    }
  }
}
