import md5 from 'md5';
import { simplifyName } from './util';

/**
 *
 */
export class FunctionResourceIDs {
  /**
   *
   * @param name
   * @param region
   * @param accountId
   */
  static FunctionDataSourceID(name: string, region?: string, accountId?: string): string {
    return `${simplifyName(name)}${simplifyName(region || '')}${accountId || ''}LambdaDataSource`;
  }

  /**
   *
   * @param name
   * @param region
   * @param accountId
   */
  static FunctionIAMRoleID(name: string, region?: string, accountId?: string): string {
    return `${FunctionResourceIDs.FunctionDataSourceID(name, region, accountId)}Role`;
  }

  /**
   *
   * @param name
   * @param withEnv
   */
  static FunctionIAMRoleName(name: string, withEnv = false): string {
    if (withEnv) {
      return `${simplifyName(name).slice(0, 22)}${md5(name).slice(0, 4)}`;
    }
    return `${simplifyName(name).slice(0, 32)}${md5(name).slice(0, 4)}`;
  }

  /**
   *
   * @param name
   * @param region
   * @param accountId
   */
  static FunctionAppSyncFunctionConfigurationID(name: string, region?: string, accountId?: string): string {
    return `Invoke${FunctionResourceIDs.FunctionDataSourceID(name, region, accountId)}`;
  }
}
