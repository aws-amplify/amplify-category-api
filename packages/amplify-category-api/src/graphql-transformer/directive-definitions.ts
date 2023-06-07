import {
  getAppSyncServiceExtraDirectives,
} from '@aws-amplify/graphql-transformer-core';
import {
  $TSContext,
} from '@aws-amplify/amplify-cli-core';
import { print } from 'graphql';
import { getTransformerFactoryV2, getTransformerFactoryV1 } from './transformer-factory';
import { getTransformerVersion } from './transformer-version';

/**
 * Return the set of directive definitions for the project, includes both appsync and amplify supported directives.
 * This will return the relevant set determined by whether or not the customer is using GQL transformer v1 or 2 in their project.
 */
export const getDirectiveDefinitions = async (context: $TSContext, resourceDir: string): Promise<string> => {
  const transformerVersion = await getTransformerVersion(context);
  const transformList = transformerVersion === 2
    ? await (await getTransformerFactoryV2(resourceDir))({ authConfig: {} })
    : await (await getTransformerFactoryV1(context, resourceDir))(true);

  const transformDirectives = transformList
    .map((transform) => [transform.directive, ...transform.typeDefinitions].map((node) => print(node)).join('\n'))
    .join('\n');

  return [getAppSyncServiceExtraDirectives(), transformDirectives].join('\n');
};
