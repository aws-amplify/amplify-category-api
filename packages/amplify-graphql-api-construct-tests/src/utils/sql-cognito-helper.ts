import * as generator from 'generate-password';
import {
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify, Auth } from 'aws-amplify';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { TestConfigOutput } from './sql-test-config-helper';

export interface GenerateUserOutput {
  username: string;
  tempPassword: string;
  password: string;
  email: string;
}

export class CognitoUserPoolAuthHelper {
  private cognitoClient: CognitoIdentityProviderClient;

  constructor(private readonly output: TestConfigOutput) {
    this.cognitoClient = new CognitoIdentityProviderClient({ region: this.output.region });
    Amplify.configure({
      Auth: {
        region: this.output.region,
        userPoolId: this.output.userPoolId,
        userPoolWebClientId: this.output.webClientId,
      },
    });
  }

  public signInUser = async (user: GenerateUserOutput): Promise<CognitoUser> => {
    const cognitoUser = await Auth.signIn(user.username, user.password);
    return cognitoUser;
  };

  public createUser = async (group?: string[]): Promise<GenerateUserOutput> => {
    const generatedUser = this.generateCognitoUser();

    await this.cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: this.output.userPoolId,
        Username: generatedUser.username,
        UserAttributes: [{ Name: 'email', Value: generatedUser.email }],
        TemporaryPassword: generatedUser.tempPassword,
        DesiredDeliveryMediums: [],
        MessageAction: 'SUPPRESS',
      }),
    );

    await this.authenticateUser(generatedUser);
    await this.addUserToGroup(generatedUser, group);

    return generatedUser;
  };

  private authenticateUser = async (user: GenerateUserOutput): Promise<void> => {
    const signinResult = await Auth.signIn(user.username, user.tempPassword);
    if (signinResult.challengeName === 'NEW_PASSWORD_REQUIRED') {
      const { requiredAttributes } = signinResult.challengeParam;
      await Auth.completeNewPassword(signinResult, user.password, requiredAttributes);
    }
  };

  private addUserToGroup = async (user: GenerateUserOutput, group: string[] | undefined): Promise<void> => {
    if (!group) {
      return;
    }

    group.forEach(async (group) => {
      await this.cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: this.output.userPoolId,
          Username: user.username,
          GroupName: group,
        }),
      );
    });
  };

  private generateCognitoUser = (): GenerateUserOutput => {
    const username = generator.generate({
      length: 5,
      lowercase: true,
      numbers: false,
      strict: false,
      symbols: false,
      uppercase: false,
    });

    const [tempPassword, password] = generator.generateMultiple(2, {
      length: 10,
      lowercase: true,
      numbers: true,
      strict: true,
      symbols: true,
      uppercase: true,
    });

    const fakeDomain = generator.generate({
      length: 10,
      lowercase: true,
      numbers: false,
      strict: false,
      symbols: false,
      uppercase: false,
    });
    const email = `${username}+TEST@${fakeDomain}.test`;

    return {
      username,
      tempPassword,
      password,
      email,
    };
  };
}

export interface UserMap {
  [key: string]: CognitoUser;
}

export const getUserMap = async (testConfigOutput: TestConfigOutput): Promise<UserMap> => {
  const groupName1 = testConfigOutput.userGroups[0];
  const groupName2 = testConfigOutput.userGroups[1];

  const authHelper = new CognitoUserPoolAuthHelper(testConfigOutput);

  const user1 = await authHelper.createUser([groupName1]);
  const user2 = await authHelper.createUser([groupName2]);

  return {
    [user1.username]: await authHelper.signInUser(user1),
    [user2.username]: await authHelper.signInUser(user2),
  };
};
