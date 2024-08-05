import { Duration } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole } from 'aws-cdk-lib/aws-iam';
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
        identityPoolId: 'identitypool123',
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
      defaultAuthorizationMode: 'API_KEY',
      apiKeyConfig: {
        expires: { toDays: () => 7 } as Duration,
      },
      iamConfig: {
        identityPoolId: 'identitypool123',
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
    });
    expect(authConfig).toBeDefined();
    expect(authConfig?.additionalAuthenticationProviders.length).toEqual(1);
  });

  it('generates for deprecated adminRoles', () => {
    const { authSynthParameters } = convertAuthorizationModesToTransformerAuthConfig({
      iamConfig: {
        identityPoolId: 'identitypool123',
        authenticatedUserRole: { roleName: 'testAuthRole' } as IRole,
        unauthenticatedUserRole: { roleName: 'testUnauthRole' } as IRole,
      },
      adminRoles: [{ roleName: 'adminRole1' } as IRole, { roleName: 'adminRole2' } as IRole],
    });
    expect(authSynthParameters.adminRoles?.length).toEqual(2);
    expect(authSynthParameters.adminRoles?.[0]).toEqual('adminRole1');
    expect(authSynthParameters.adminRoles?.[1]).toEqual('adminRole2');
  });

  it('generates for allowListedRoles', () => {
    const { authSynthParameters } = convertAuthorizationModesToTransformerAuthConfig({
      iamConfig: {
        identityPoolId: 'identitypool123',
        authenticatedUserRole: { roleName: 'testAuthRole' } as IRole,
        unauthenticatedUserRole: { roleName: 'testUnauthRole' } as IRole,
        allowListedRoles: [{ roleName: 'allowListed1Role' } as IRole, 'allowListed2String'],
      },
    });
    expect(authSynthParameters.adminRoles?.length).toEqual(2);
    expect(authSynthParameters.adminRoles?.[0]).toEqual('allowListed1Role');
    expect(authSynthParameters.adminRoles?.[1]).toEqual('allowListed2String');
  });

  it('merged allowListedRoles and deprecated adminRoles', () => {
    const { authSynthParameters } = convertAuthorizationModesToTransformerAuthConfig({
      iamConfig: {
        identityPoolId: 'identitypool123',
        authenticatedUserRole: { roleName: 'testAuthRole' } as IRole,
        unauthenticatedUserRole: { roleName: 'testUnauthRole' } as IRole,
        allowListedRoles: [{ roleName: 'allowListed1Role' } as IRole, 'allowListed2String'],
      },
      adminRoles: [{ roleName: 'adminRole3' } as IRole],
    });
    expect(authSynthParameters.adminRoles?.length).toEqual(3);
    expect(authSynthParameters.adminRoles?.[0]).toEqual('allowListed1Role');
    expect(authSynthParameters.adminRoles?.[1]).toEqual('allowListed2String');
    expect(authSynthParameters.adminRoles?.[2]).toEqual('adminRole3');
  });
});
