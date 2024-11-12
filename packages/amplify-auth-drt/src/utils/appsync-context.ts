// #region Types

export interface AppSyncContext {
  // Documented as required, but not present in operations that don't actually have args
  arguments?: any;

  // Documented as required, but not present in operations that don't actually have args
  args?: any;

  identity: Identity;
  source: any;
  error?:
    | {
        message: string;
        type: string;
      }
    | undefined
    | null;
  stash: any;
  result: any;
  prev: any;
  request: any;

  // NB: The info object is not supported when testing the mapping template
  // info...
}

export type Identity = ApiKeyIdentity | AppSyncIdentityLambda | AppSyncIdentityIAM | AppSyncIdentityCognitoUserPools;

export type ApiKeyIdentity = null | undefined;

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

// #endregion

// #region Utilities

export const makeApiKeyIdentity = (): ApiKeyIdentity => {
  return undefined;
};

export const makeUserPoolsIdentity = (partialIdentity: Partial<AppSyncIdentityCognitoUserPools> = {}): AppSyncIdentityCognitoUserPools => {
  return {
    sub: 'uuid',
    issuer: 'https://cognito-idp.{region}.amazonaws.com/{userPoolId}',
    username: 'my-username',
    claims: {
      sub: 'uuid',
      'cognito:username': 'my-username'
    },
    sourceIp: ['x.x.x.x'],
    defaultAuthStrategy: 'ALLOW',
    groups: [],
    ...partialIdentity,
  };
};

export const makeContext = (partialContext: Partial<AppSyncContext> = {}): AppSyncContext => {
  return {
    arguments: {},
    args: {},
    identity: makeApiKeyIdentity(),
    source: {},
    stash: {},
    result: {},
    prev: {},
    request: {},
    ...partialContext,
  };
};

/**
 * Returns a minimal context object that mimics API Key requests (i.e., it includes an `x-api-key` HTTP header and a `null` `identity`
 * field)
 */
export const makeApiKeyContext = (partialContext: Partial<AppSyncContext> = {}): AppSyncContext => {
  return makeContext({
    identity: makeApiKeyIdentity(),
    ...partialContext,
  });
};

/**
 * Returns a minimal context object that mimics User Pools requests (i.e., it includes an authorization header and a User Pools identity
 * field)
 */
export const makeUserPoolsContext = (partialContext: Partial<AppSyncContext> = {}): AppSyncContext => {
  const partialIdentity = partialContext.identity ?? {};
  const identity = makeUserPoolsIdentity(partialIdentity);
  return makeContext({
    identity,
    ...partialContext,
  });
};

// #endregion
