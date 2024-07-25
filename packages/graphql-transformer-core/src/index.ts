import './polyfills/Object.assign';
import { print } from 'graphql';
import { DeploymentResources } from './DeploymentResources';
import { TransformerContext, MappingParameters } from './TransformerContext';
import { Transformer } from './Transformer';
import { ITransformer } from './ITransformer';
import { GraphQLTransform } from './GraphQLTransform';
import { collectDirectiveNames, collectDirectivesByType, collectDirectivesByTypeNames } from './collectDirectives';
import { stripDirectives } from './stripDirectives';
import {
  buildProject as buildAPIProject,
  uploadDeployment as uploadAPIProject,
  migrateAPIProject,
  revertAPIMigration,
  CLOUDFORMATION_FILE_NAME,
  PARAMETERS_FILE_NAME,
} from './util/amplifyUtils';
import {
  readSchema as readProjectSchema,
  loadProject as readProjectConfiguration,
  loadConfig as readTransformerConfiguration,
  writeConfig as writeTransformerConfiguration,
} from './util/transformConfig';
import { EXTRA_DIRECTIVES_DOCUMENT } from './validation';

export * from './errors';
export * from './util';
export { getTableNameForModel } from './tableNameMap';

/**
 * Returns the set of directives that are supported by AppSync service
 */
export function getAppSyncServiceExtraDirectives(): string {
  return print(EXTRA_DIRECTIVES_DOCUMENT);
}
export { FeatureFlagProvider } from './FeatureFlags';

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
// No-op change to trigger publish
