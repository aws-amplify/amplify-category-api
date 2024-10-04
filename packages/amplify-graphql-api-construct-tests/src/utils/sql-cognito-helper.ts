import {
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify, Auth } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { AuthConstructStackOutputs } from '../types';

export class CognitoIdentityPoolCredentialsManager {
  private cognitoClient: CognitoIdentityProviderClient;

  private readonly tempPassword = 'Password123!';

  constructor(private readonly outputs: AuthConstructStackOutputs) {
    this.cognitoClient = new CognitoIdentityProviderClient({ region: this.outputs.authRegion });
    Amplify.configure({
      Auth: {
        region: this.outputs.authRegion,
        userPoolId: this.outputs.userPoolId,
        userPoolWebClientId: this.outputs.webClientId,
        signIn: {
          username: true,
        },
      },
    });
  }

  public getAuthRoleCredentials = async (user: Record<string, string>): Promise<any> => {
    const credentials = await Auth.signIn(user.username, user.password);
    return credentials;
    // console.log(temp.signInUserSession.idToken.jwtToken);
    // const credentials = await Auth.currentCredentials();
    // return credentials;
  };

  public getUnAuthRoleCredentials = async (user: Record<string, string>): Promise<ICredentials> => {
    await Auth.signOut();
    return await Auth.currentCredentials();
  };

  public createUser = async (user: Record<string, string>, group?: string[]): Promise<void> => {
    await this.cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: this.outputs.userPoolId,
        Username: user.username,
        UserAttributes: [{ Name: 'email', Value: user.email }],
        TemporaryPassword: this.tempPassword,
        DesiredDeliveryMediums: [],
        MessageAction: 'SUPPRESS',
      }),
    );

    await this.authenticateUser(user);
    await this.addUserToGroup(user, group);
  };

  private authenticateUser = async (user: Record<string, string>): Promise<void> => {
    const signinResult = await Auth.signIn(user.username, this.tempPassword);
    if (signinResult.challengeName === 'NEW_PASSWORD_REQUIRED') {
      const { requiredAttributes } = signinResult.challengeParam;
      await Auth.completeNewPassword(signinResult, user.password, requiredAttributes);
    }
  };

  private addUserToGroup = async (user: Record<string, string>, group: string[] | undefined): Promise<void> => {
    if (!group) {
      return;
    }

    group.forEach(async (group) => {
      await this.cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: this.outputs.userPoolId,
          Username: user.username,
          GroupName: group,
        }),
      );
    });
  };
}
