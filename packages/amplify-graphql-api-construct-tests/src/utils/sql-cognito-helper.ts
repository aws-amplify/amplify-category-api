import {
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify, Auth } from 'aws-amplify';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { UserPoolAuthConstructStackOutputs } from '../types';

export class CognitoUserPoolAuthHelper {
  private cognitoClient: CognitoIdentityProviderClient;

  private readonly tempPassword = 'Password123!';

  constructor(private readonly outputs: UserPoolAuthConstructStackOutputs) {
    this.cognitoClient = new CognitoIdentityProviderClient({ region: this.outputs.region });
    Amplify.configure({
      Auth: {
        region: this.outputs.region,
        userPoolId: this.outputs.userPoolId,
        userPoolWebClientId: this.outputs.webClientId,
      },
    });
  }

  public getAuthRoleCredentials = async (user: Record<string, string>): Promise<CognitoUser> => {
    const cognitoUser = await Auth.signIn(user.username, user.password);
    return cognitoUser;
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
