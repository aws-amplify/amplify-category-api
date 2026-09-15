import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import Amplify, { Auth } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { AuthConstructStackOutputs } from './types';

export class CognitoIdentityPoolCredentialsFactory {
  private readonly username = 'user@test.com';
  private readonly tmpPassword = 'Password123!';
  private readonly realPassword = 'Password1234!';
  private hasUser = false;

  constructor(private readonly outputs: AuthConstructStackOutputs) {}

  getAuthRoleCredentials = async (): Promise<ICredentials> => {
    await this.createUserIfNeeded();
    Amplify.configure({
      Auth: {
        region: this.outputs.authRegion,
        userPoolId: this.outputs.userPoolId,
        userPoolWebClientId: this.outputs.webClientId,
        identityPoolId: this.outputs.identityPoolId,
      },
    });
    await Auth.signIn(this.username, this.realPassword);
    return await Auth.currentCredentials();
  };

  getUnAuthRoleCredentials = async (): Promise<ICredentials> => {
    Amplify.configure({
      Auth: {
        region: this.outputs.authRegion,
        userPoolId: this.outputs.userPoolId,
        userPoolWebClientId: this.outputs.webClientId,
        identityPoolId: this.outputs.identityPoolId,
      },
    });
    await Auth.signOut();
    return await Auth.currentCredentials();
  };

  private createUserIfNeeded = async (): Promise<void> => {
    if (!this.hasUser) {
      const cognitoClient = new CognitoIdentityProviderClient({ region: this.outputs.authRegion });
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: this.outputs.userPoolId,
          UserAttributes: [{ Name: 'email', Value: this.username }],
          Username: this.username,
          TemporaryPassword: this.tmpPassword,
          DesiredDeliveryMediums: [],
          MessageAction: 'SUPPRESS',
        }),
      );
      Amplify.configure({
        Auth: {
          region: this.outputs.authRegion,
          userPoolId: this.outputs.userPoolId,
          userPoolWebClientId: this.outputs.webClientId,
          identityPoolId: this.outputs.identityPoolId,
        },
      });

      const signInResult = await Auth.signIn(this.username, this.tmpPassword);

      if (signInResult.challengeName === 'NEW_PASSWORD_REQUIRED') {
        const { requiredAttributes } = signInResult.challengeParam;

        await Auth.completeNewPassword(signInResult, this.realPassword, requiredAttributes);
      }
      this.hasUser = true;
    }
  };
}
