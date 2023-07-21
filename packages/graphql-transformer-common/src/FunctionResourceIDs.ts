import md5 from 'md5';
import { simplifyName } from './util';

export class FunctionResourceIDs {
  static FunctionDataSourceID(name: string, region?: string, accountId?: string): string {
    return `${simplifyName(name)}${simplifyName(region || '')}${accountId || ''}LambdaDataSource`;
  }

  static FunctionIAMRoleID(name: string, region?: string, accountId?: string): string {
    return `${FunctionResourceIDs.FunctionDataSourceID(name, region, accountId)}Role`;
  }

  static FunctionIAMRoleName(name: string, withEnv: boolean = false): string {
    if (withEnv) {
      return `${simplifyName(name).slice(0, 22)}${md5(name).slice(0, 4)}`;
    }
    return `${simplifyName(name).slice(0, 32)}${md5(name).slice(0, 4)}`;
  }

  static FunctionAppSyncFunctionConfigurationID(name: string, region?: string, accountId?: string): string {
    return `Invoke${FunctionResourceIDs.FunctionDataSourceID(name, region, accountId)}`;
  }
}
