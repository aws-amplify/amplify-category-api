import { SyncConfig } from '@aws-amplify/graphql-transformer-core';

export type ModelTransformerOptions = {
  EnableDeletionProtection?: boolean;
  SyncConfig?: SyncConfig;
};

export const MYSQL_DB_TYPE = 'MySQL';
export const DDB_DB_TYPE = 'DDB';
