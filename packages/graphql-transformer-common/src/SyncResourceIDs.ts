import { simplifyName } from './util';

/**
 * Constants for the DataStore resource
 */
export class SyncResourceIDs {
  public static syncDataSourceID = 'DataStore';
  public static syncTableName = 'AmplifyDataStore';
  public static syncPrimaryKey = 'ds_pk';
  public static syncRangeKey = 'ds_sk';
  public static syncGSIName = 'deltaSyncGSI';
  public static syncGSIPartitionKey = 'gsi_ds_pk';
  public static syncGSISortKey = 'gsi_ds_sk';
  public static syncIAMRoleID = 'DataStoreIAMRole'
  public static syncIAMRoleName = 'AmplifyDataStoreIAMRole';
  public static syncFunctionRoleName = 'DataStoreLambdaRole';

  /**
   * Returns the syncFunctionID
   */
  public static syncFunctionID(name: string, region?: string): string {
    return `${simplifyName(name)}${simplifyName(region || '')}Role`;
  }
}
