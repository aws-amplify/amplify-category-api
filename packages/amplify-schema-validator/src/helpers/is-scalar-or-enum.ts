import { EnumTypeDefinitionNode, Kind, TypeNode } from 'graphql';

type ScalarMap = {
  [k: string]: 'String' | 'Int' | 'Float' | 'Boolean' | 'ID';
};
export const STANDARD_SCALARS: ScalarMap = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  Boolean: 'Boolean',
  ID: 'ID',
};

const OTHER_SCALARS: ScalarMap = {
  BigInt: 'Int',
  Double: 'Float',
};

export const APPSYNC_DEFINED_SCALARS: ScalarMap = {
  AWSDate: 'String',
  AWSTime: 'String',
  AWSDateTime: 'String',
  AWSTimestamp: 'Int',
  AWSEmail: 'String',
  AWSJSON: 'String',
  AWSURL: 'String',
  AWSPhone: 'String',
  AWSIPAddress: 'String',
};

export const DEFAULT_SCALARS: ScalarMap = {
  ...STANDARD_SCALARS,
  ...OTHER_SCALARS,
  ...APPSYNC_DEFINED_SCALARS,
};

/**
 * Returns whether a given type is a scalar or enum
 *
 * @param type the type to check whether it's a scalar
 * @param enums enums to consider as scalars
 * @returns boolean
 */
export const isScalarOrEnum = (type: TypeNode, enums: EnumTypeDefinitionNode[]): boolean => {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return isScalarOrEnum(type.type, enums);
  }
  if (type.kind === Kind.LIST_TYPE) {
    /* istanbul ignore next */
    return false;
  }
  for (const e of enums) {
    if (e.name.value === type.name.value) {
      return true;
    }
  }
  return Boolean(DEFAULT_SCALARS[type.name.value]);
};
