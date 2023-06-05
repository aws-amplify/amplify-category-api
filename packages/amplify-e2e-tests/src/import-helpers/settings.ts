import {
  AddAuthUserPoolOnlyWithOAuthSettings,
  AddAuthUserPoolOnlyNoOAuthSettings,
  AddAuthIdentityPoolAndUserPoolWithOAuthSettings,
  AddStorageSettings,
  AddDynamoDBSettings,
} from 'amplify-category-api-e2e-core';

/**
 *
 * @param projectPrefix
 * @param shortId
 */
export const createNoOAuthSettings = (projectPrefix: string, shortId: string): AddAuthUserPoolOnlyNoOAuthSettings => ({
  resourceName: `${projectPrefix}res${shortId}`,
  userPoolName: `${projectPrefix}up${shortId}`,
});

/**
 *
 * @param projectPrefix
 * @param shortId
 */
export const createUserPoolOnlyWithOAuthSettings = (projectPrefix: string, shortId: string): AddAuthUserPoolOnlyWithOAuthSettings => ({
  resourceName: `${projectPrefix}oares${shortId}`,
  userPoolName: `${projectPrefix}oaup${shortId}`,
  domainPrefix: `${projectPrefix}oadom${shortId}`,
  signInUrl1: 'https://sin1/',
  signInUrl2: 'https://sin2/',
  signOutUrl1: 'https://sout1/',
  signOutUrl2: 'https://sout2/',
  facebookAppId: 'facebookAppId',
  facebookAppSecret: 'facebookAppSecret',
  googleAppId: 'googleAppId',
  googleAppSecret: 'googleAppSecret',
  amazonAppId: 'amazonAppId',
  amazonAppSecret: 'amazonAppSecret',
  appleAppClientId: 'com.fake.app',
  appleAppTeamId: '2QLEWNDK6K',
  appleAppKeyID: '2QLZXKYJ8J',
  appleAppPrivateKey:
      'MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgIltgNsTgTfSzUadYiCS0VYtDDMFln/J8i1yJsSIw5g+gCgYIKoZIzj0DAQehRANCAASI8E0L/DhR/mIfTT07v3VwQu6q8I76lgn7kFhT0HvWoLuHKGQFcFkXXCgztgBrprzd419mUChAnKE6y89bWcNw',
});

/**
 *
 * @param projectPrefix
 * @param shortId
 */
export const createIDPAndUserPoolWithOAuthSettings = (
  projectPrefix: string,
  shortId: string,
): AddAuthIdentityPoolAndUserPoolWithOAuthSettings => {
  const settings = createUserPoolOnlyWithOAuthSettings(projectPrefix, shortId);

  return {
    ...settings,
    allowUnauthenticatedIdentities: true,
    identityPoolName: `${projectPrefix}oaidp${shortId}`,
    idpFacebookAppId: 'idpFacebookAppId',
    idpGoogleAppId: 'idpGoogleAppId',
    idpAmazonAppId: 'idpAmazonAppId',
    idpAppleAppId: 'idpAppleId',
  } as AddAuthIdentityPoolAndUserPoolWithOAuthSettings;
};

/**
 *
 * @param projectPrefix
 * @param shortId
 */
export const createStorageSettings = (projectPrefix: string, shortId: string): AddStorageSettings => ({
  resourceName: `${projectPrefix}res${shortId}`,
  bucketName: `${projectPrefix}bkt${shortId}`,
});

/**
 *
 * @param projectPrefix
 * @param shortId
 */
export const createDynamoDBSettings = (projectPrefix: string, shortId: string): AddDynamoDBSettings => ({
  resourceName: `${projectPrefix}res${shortId}`,
  tableName: `${projectPrefix}tbl${shortId}`,
  gsiName: `${projectPrefix}gsi${shortId}`,
});
