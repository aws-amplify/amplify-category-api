import { simplifyName } from './util';
import md5 from 'md5';
import { DirectiveNode } from 'graphql';
import { getDirectiveArguments, TransformerContractError } from 'graphql-transformer-core';

export interface FunctionDirectiveConfig {
  name: string;
  region?: string;
  accountId?: string;
}

export function parseFunctionDirective(directive: DirectiveNode): FunctionDirectiveConfig {
  const { name, region, accountId } = getDirectiveArguments(directive);

  if (!name) {
    throw new TransformerContractError(`Must supply a 'name' to @function.`);
  }

  return { name, region, accountId };
}

export class FunctionResourceIDs {
  static FunctionDataSourceID({ name, region, accountId }: FunctionDirectiveConfig): string {
    return `${simplifyName(name)}${simplifyName(region || '')}${accountId || ''}LambdaDataSource`;
  }

  static FunctionIAMRoleID(fdConfig: FunctionDirectiveConfig): string {
    return `${FunctionResourceIDs.FunctionDataSourceID(fdConfig)}Role`;
  }

  static FunctionIAMRoleName(name: string, withEnv: boolean = false): string {
    if (withEnv) {
      return `${simplifyName(name).slice(0, 22)}${md5(name).slice(0, 4)}`;
    }
    return `${simplifyName(name).slice(0, 32)}${md5(name).slice(0, 4)}`;
  }

  static FunctionAppSyncFunctionConfigurationID(fdConfig: FunctionDirectiveConfig): string {
    return `Invoke${FunctionResourceIDs.FunctionDataSourceID(fdConfig)}`;
  }
}
