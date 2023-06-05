import { simplifyName } from './util';

/**
 *
 */
export class SyncResourceIDs {
  public static syncDataSourceID = 'DataStore';
  public static syncTableName = 'AmplifyDataStore';
  public static syncPrimaryKey = 'ds_pk';
  public static syncRangeKey = 'ds_sk';
  public static syncIAMRoleID = 'DataStoreIAMRole';
  public static syncIAMRoleName = 'AmplifyDataStoreIAMRole';
  public static syncFunctionRoleName = 'DataStoreLambdaRole';
  /**
   *
   * @param name
   * @param region
   */
  public static syncFunctionID(name: string, region?: string): string {
    return `${simplifyName(name)}${simplifyName(region || '')}Role`;
  }
}
