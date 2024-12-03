import { ArgumentNode, DirectiveNode, ListValueNode, NameNode, ObjectFieldNode, ObjectValueNode, StringValueNode } from 'graphql';

export interface AuthDirective extends DirectiveNode {
  readonly name: NameNode & { value: 'auth' };
  readonly arguments: [AuthDirectiveRulesArgument];
}

export interface AuthDirectiveRulesArgument extends ArgumentNode {
  readonly name: NameNode & { value: 'rules' };
  readonly value: AuthDirectiveRulesListValue;
}

export interface AuthDirectiveRulesListValue extends ListValueNode {
  readonly values: AuthDirectiveRuleValue[];
}

export type AuthDirectiveRuleValue = ObjectValueNode & {
  fields: AuthDirectiveRuleFieldValue[];
};

export type AuthDirectiveRuleFieldValue =
  | AuthDirectiveRuleFieldAllowOwner
  | AuthDirectiveRuleFieldAllowPublic
  | AuthDirectiveRuleFieldProviderApiKey
  | AuthDirectiveRuleFieldProviderUserPools;

export type AuthDirectiveRuleFieldAllowOwner = ObjectFieldNode & {
  name: NameNode & { value: 'allow' };
  value: StringValueNode & {
    value: 'owner';
  };
};

export type AuthDirectiveRuleFieldAllowPublic = ObjectFieldNode & {
  name: NameNode & { value: 'allow' };
  value: StringValueNode & {
    value: 'public';
  };
};

export type AuthDirectiveRuleFieldProviderApiKey = ObjectFieldNode & {
  name: NameNode & { value: 'provider' };
  value: StringValueNode & {
    value: 'apiKey';
  };
};

export type AuthDirectiveRuleFieldProviderUserPools = ObjectFieldNode & {
  name: NameNode & { value: 'provider' };
  value: StringValueNode & {
    value: 'apiKey';
  };
};

export const isAuthDirective = (obj: DirectiveNode): obj is AuthDirective => obj.name.value === 'auth';
