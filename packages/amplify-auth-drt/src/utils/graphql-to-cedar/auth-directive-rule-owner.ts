import { ObjectValueNode, ObjectFieldNode, NameNode, StringValueNode } from 'graphql';
import { isEnumValueNode } from '../graphql-utils';

export type AuthDirectiveRuleValueOwner = AuthDirectiveRuleValueOwnerDefault | AuthDirectiveRuleValueOwnerUserPools;

export interface AuthDirectiveRuleValueOwnerDefault extends ObjectValueNode {
  readonly fields: [
    ObjectFieldNode & {
      name: NameNode & { value: 'allow' };
      value: StringValueNode & {
        value: 'owner';
      };
    },
  ];
}

export const isAuthDirectiveRuleValueOwnerDefault = (obj: ObjectValueNode): obj is AuthDirectiveRuleValueOwnerDefault =>
  obj.fields[0].name.value === 'allow' && isEnumValueNode(obj.fields[0].value) && obj.fields[0].value.value === 'owner';

export interface AuthDirectiveRuleValueOwnerUserPools extends ObjectValueNode {
  readonly fields: [
    ObjectFieldNode & {
      name: NameNode & { value: 'allow' };
      value: StringValueNode & {
        value: 'owner';
      };
    },
    ObjectFieldNode & {
      name: NameNode & { value: 'provider' };
      value: StringValueNode & {
        value: 'userPools';
      };
    },
  ];
}

export const isAuthDirectiveRuleValueOwnerUserPools = (obj: ObjectValueNode): obj is AuthDirectiveRuleValueOwnerUserPools =>
  obj.fields[0].name.value === 'allow' &&
  isEnumValueNode(obj.fields[0].value) &&
  obj.fields[0].value.value === 'owner' &&
  obj.fields[1].name.value === 'provider' &&
  isEnumValueNode(obj.fields[1].value) &&
  obj.fields[1].value.value === 'userPools';
