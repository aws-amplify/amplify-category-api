import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { convertAuthorizationModesToTransformerAuthConfig } from '../../internal/authorization-modes';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

describe('convertAuthorizationModesToTransformerAuthConfig', () => {
  it('generates userPool auth parameters', () => {
    const userPool = { userPoolId: 'testId' } as IUserPool;
    const { cfnIncludeParameters } = convertAuthorizationModesToTransformerAuthConfig({
      userPoolConfig: { userPool },
    });
    expect('AuthCognitoUserPoolId' in cfnIncludeParameters).toEqual(true);
    expect(cfnIncludeParameters.AuthCognitoUserPoolId).toEqual('testId');
  });

  it('generates auth and unauth role parameters', () => {
    const authenticatedUserRole = { roleName: 'testAuthRole' } as IRole;
    const unauthenticatedUserRole = { roleName: 'testUnauthRole' } as IRole;
    const { cfnIncludeParameters } = convertAuthorizationModesToTransformerAuthConfig({
      iamConfig: {
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
    });
    expect('authRoleName' in cfnIncludeParameters).toEqual(true);
    expect(cfnIncludeParameters.authRoleName).toEqual('testAuthRole');
    expect('unauthRoleName' in cfnIncludeParameters).toEqual(true);
    expect(cfnIncludeParameters.unauthRoleName).toEqual('testUnauthRole');
  });

  it('generates for multiple auth modes', () => {
    const authenticatedUserRole = { roleName: 'testAuthRole' } as IRole;
    const unauthenticatedUserRole = { roleName: 'testUnauthRole' } as IRole;
    const { authConfig } = convertAuthorizationModesToTransformerAuthConfig({
      defaultAuthMode: 'API_KEY',
      apiKeyConfig: {
        expires: { toDays: () => 7 } as Duration,
      },
      iamConfig: {
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
    });
    expect(authConfig).toBeDefined();
    expect(authConfig?.additionalAuthenticationProviders.length).toEqual(1);
  });
});