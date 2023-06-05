import { SyncConfig } from '@aws-amplify/graphql-transformer-core';

/**
 *
 */
export type ModelTransformerOptions = {
  EnableDeletionProtection?: boolean;
  SyncConfig?: SyncConfig;
};
