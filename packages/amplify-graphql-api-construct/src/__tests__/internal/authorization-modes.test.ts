import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import { convertAuthorizationModesToTransformerAuthConfig } from '../../internal/authorization-modes';

describe('convertAuthorizationModesToTransformerAuthConfig', () => {
  it('generates userPool auth parameters', () => {
    const userPool = { userPoolId: 'testId' } as IUserPool;
    const {
      authSynthParameters: { userPoolId },
    } = convertAuthorizationModesToTransformerAuthConfig({
      userPoolConfig: { userPool },
    });
    expect(userPoolId).toEqual('testId');
  });

  it('generates auth and unauth role parameters', () => {
    const authenticatedUserRole = { roleName: 'testAuthRole' } as IRole;
    const unauthenticatedUserRole = { roleName: 'testUnauthRole' } as IRole;
    const {
      authSynthParameters: { authenticatedUserRoleName, unauthenticatedUserRoleName },
    } = convertAuthorizationModesToTransformerAuthConfig({
      iamConfig: {
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
    });
    expect(authenticatedUserRoleName).toEqual('testAuthRole');
    expect(unauthenticatedUserRoleName).toEqual('testUnauthRole');
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
