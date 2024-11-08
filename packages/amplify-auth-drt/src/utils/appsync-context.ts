export const makeContext = (partialContext: Partial<AppSyncContext> = {}): AppSyncContext => {
  return {
    arguments: {},
    args: {},
    identity: undefined,
    source: {},
    stash: {},
    result: {},
    prev: {},
    request: {},
    info: {
      fieldName: '',
      parentTypeName: '',
      variables: {},
      selectionSetList: [],
      selectionSetGraphQL: '',
    },
    ...partialContext,
  };
};

export interface AppSyncContext {
  arguments: any;
  args: any;
  identity: Identity;
  source: any;
  error?: {
    message: string;
    type: string;
  };
  stash: any;
  result: any;
  prev: any;
  request: any;
  info: Info;
}

export type Identity = ApiKeyIdentity | AppSyncIdentityLambda | AppSyncIdentityIAM | AppSyncIdentityCognitoUserPools;

export type ApiKeyIdentity = undefined;

export type AppSyncIdentityLambda = {
  resolverContext: any;
};

export type AppSyncIdentityIAM = {
  accountId: string;
  cognitoIdentityPoolId: string;
  cognitoIdentityId: string;
  sourceIp: string[];
  username: string;
  userArn: string;
  cognitoIdentityAuthType: string;
  cognitoIdentityAuthProvider: string;
};

export type AppSyncIdentityCognitoUserPools = {
  sourceIp: string[];
  username: string;
  groups: string[] | null;
  sub: string;
  issuer: string;
  claims: any;
  defaultAuthStrategy: string;
};

type Info = {
  fieldName: string;
  parentTypeName: string;
  variables: any;
  selectionSetList: string[];
  selectionSetGraphQL: string;
};
