import { print } from 'graphql';
import { collectDirectiveNames, collectDirectivesByType, collectDirectivesByTypeNames } from './collectDirectives';
import { DeploymentResources } from './DeploymentResources';
import { GraphQLTransform } from './GraphQLTransform';
import { ITransformer } from './ITransformer';
import './polyfills/Object.assign';
import { stripDirectives } from './stripDirectives';
import { Transformer } from './Transformer';
import { MappingParameters, TransformerContext } from './TransformerContext';
import {
  buildProject as buildAPIProject,
  CLOUDFORMATION_FILE_NAME,
  migrateAPIProject,
  PARAMETERS_FILE_NAME,
  revertAPIMigration,
  uploadDeployment as uploadAPIProject,
} from './util/amplifyUtils';
import {
  loadConfig as readTransformerConfiguration,
  loadProject as readProjectConfiguration,
  readSchema as readProjectSchema,
  writeConfig as writeTransformerConfiguration,
} from './util/transformConfig';
import { EXTRA_DIRECTIVES_DOCUMENT } from './validation';

export * from './errors';
export { FeatureFlagProvider } from './FeatureFlags';
export { getTableNameForModel } from './tableNameMap';
export * from './util';
export {
  GraphQLTransform,
  TransformerContext,
  MappingParameters,
  Transformer,
  ITransformer,
  collectDirectiveNames,
  collectDirectivesByType,
  collectDirectivesByTypeNames,
  stripDirectives,
  buildAPIProject,
  migrateAPIProject,
  uploadAPIProject,
  readProjectSchema,
  readProjectConfiguration,
  readTransformerConfiguration,
  writeTransformerConfiguration,
  revertAPIMigration,
  DeploymentResources,
  CLOUDFORMATION_FILE_NAME,
  PARAMETERS_FILE_NAME,
};

/**
 * Returns the set of directives that are supported by AppSync service
 */
export function getAppSyncServiceExtraDirectives(): string {
  return print(EXTRA_DIRECTIVES_DOCUMENT);
}

// No-op change to trigger publish
