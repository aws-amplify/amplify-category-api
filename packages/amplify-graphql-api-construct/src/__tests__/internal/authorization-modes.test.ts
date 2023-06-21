import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { convertAuthorizationModesToTransformerAuthConfig } from '../../internal/authorization-modes';
import { IRole } from 'aws-cdk-lib/aws-iam';

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
    const authRole = { roleName: 'testAuthRole' } as IRole;
    const unauthRole = { roleName: 'testUnauthRole' } as IRole;
    const { cfnIncludeParameters } = convertAuthorizationModesToTransformerAuthConfig({
      iamConfig: {
        authRole,
        unauthRole,
      },
    });
    expect('authRoleName' in cfnIncludeParameters).toEqual(true);
    expect(cfnIncludeParameters.authRoleName).toEqual('testAuthRole');
    expect('unauthRoleName' in cfnIncludeParameters).toEqual(true);
    expect(cfnIncludeParameters.unauthRoleName).toEqual('testUnauthRole');
  });
});