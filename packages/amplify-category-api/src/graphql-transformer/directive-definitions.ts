import { getAppSyncServiceExtraDirectives } from '@aws-amplify/graphql-transformer-core';
import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { print } from 'graphql';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { getTransformerFactoryV1, loadCustomTransformersV2 } from './transformer-factory';
import { getTransformerVersion } from './transformer-version';
import { constructTransformerChain } from '../amplify-graphql-transform';

/**
 * Return the set of directive definitions for the project, includes both appsync and amplify supported directives.
 * This will return the relevant set determined by whether or not the customer is using GQL transformer v1 or 2 in their project.
 */
export const getDirectiveDefinitions = async (context: $TSContext, resourceDir: string): Promise<string> => {
  const transformerVersion = await getTransformerVersion(context);
  const transformList = transformerVersion === 2
    ? await getTransformListV2(resourceDir)
    : await getTransformerFactoryV1(context, resourceDir)(true);

  const transformDirectives = transformList
    .map((transform) => [transform.directive, ...transform.typeDefinitions].map((node) => print(node)).join('\n'))
    .join('\n');

  return [getAppSyncServiceExtraDirectives(), transformDirectives].join('\n');
};

const getTransformListV2 = async (resourceDir: string): Promise<TransformerPluginProvider[]> => {
  const customTransformers = await loadCustomTransformersV2(resourceDir);
  return constructTransformerChain({ authConfig: {}, customTransformers });
};
