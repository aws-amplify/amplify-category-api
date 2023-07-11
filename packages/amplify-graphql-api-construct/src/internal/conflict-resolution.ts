import { ResolverConfig, SyncConfig, ConflictHandlerType } from '@aws-amplify/graphql-transformer-core';
import { ConflictResolutionStrategy, ConflictResolution } from '../types';

/**
 * Convert project conflict resolution config to transformer ResolverConfig object.
 * @param param0 input shape
 * @param param0.project the project level config
 * @param param0.models the model-specific override config
 * @returns the transformer representation
 */
export const convertToResolverConfig = ({ project, models }: ConflictResolution): ResolverConfig => ({
  project: project && convertToSyncConfig(project),
  models: models && Object.fromEntries(Object.entries(models).map(([modelName, strategy]) => [modelName, convertToSyncConfig(strategy)])),
});

/**
 * Convert from external to internal representation of conflict resolution config.
 * @param strategy the strategy to convert
 * @returns the converted strategy
 */
const convertToSyncConfig = (strategy: ConflictResolutionStrategy): SyncConfig => {
  switch (strategy.handlerType) {
    case 'OPTIMISTIC_CONCURRENCY':
      return {
        ConflictHandler: ConflictHandlerType.OPTIMISTIC,
        ConflictDetection: strategy.detectionType,
      };
    case 'AUTOMERGE':
      return {
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
        ConflictDetection: strategy.detectionType,
      };
    case 'LAMBDA':
      return {
        ConflictHandler: ConflictHandlerType.LAMBDA,
        ConflictDetection: strategy.detectionType,
        LambdaConflictHandler: {
          name: strategy.conflictHandler.functionName,
          lambdaArn: strategy.conflictHandler.functionArn,
        },
      };
    default:
      throw new Error(`Encountered unexpected handlerType: ${(strategy as any).handlerType}`);
  }
};
