import { getAppSyncServiceExtraDirectives } from '@aws-amplify/graphql-transformer-core';
import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { print } from 'graphql';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { constructTransformerChain } from '@aws-amplify/graphql-transformer';
import { getTransformerFactoryV1 } from './transformer-factory';
import { getTransformerVersion } from './transformer-version';
import { loadCustomTransformersV2 } from './transformer-options-v2';

/**
 * Return the set of directive definitions for the project, includes both appsync and amplify supported directives.
 * This will return the relevant set determined by whether or not the customer is using GQL transformer v1 or 2 in their project.
 */
export const getDirectiveDefinitions = async (context: $TSContext, resourceDir: string): Promise<string> => {
  const transformerVersion = await getTransformerVersion(context);
  const transformList =
    transformerVersion === 2 ? await getTransformListV2(resourceDir) : await getTransformerFactoryV1(context, resourceDir)(true);

  const transformDirectives = transformList
    .map((transform) => [transform.directive, ...transform.typeDefinitions].map((node) => print(node)).join('\n'))
    .join('\n');

  return [getAppSyncServiceExtraDirectives(), transformDirectives].join('\n');
};

/**
 * Get the list of v2 transformers, including custom transformers.
 * @param resourceDir directory to search for custom transformer config in.
 * @returns the list of transformers, including any defined custom transformers.
 */
const getTransformListV2 = async (resourceDir: string): Promise<TransformerPluginProvider[]> =>
  constructTransformerChain({
    customTransformers: await loadCustomTransformersV2(resourceDir),
  });
