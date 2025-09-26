import path from 'path';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getProjectMeta, getBackendAmplifyMeta } from 'amplify-category-api-e2e-core';
import Amplify, { Auth } from 'aws-amplify';
import fs from 'fs-extra';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';

const tempPassword = 'tempPassword';

// setupUser will add user to a cognito group and make its status to be "CONFIRMED",
// if groupName is specified, add the user to the group.
export async function setupUser(userPoolId: string, username: string, password: string, groupName?: string | string[]) {
  const region = userPoolId.split('_')[0]; // UserPoolId is in format `region_randomid`
  const cognitoClient = getConfiguredCognitoClient(region);
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      UserAttributes: [{ Name: 'email', Value: 'username@amazon.com' }],
      Username: username,
      MessageAction: 'SUPPRESS',
      TemporaryPassword: tempPassword,
    }),
  );

  await authenticateUser(username, tempPassword, password);

  if (groupName) {
    if (Array.isArray(groupName)) {
      groupName.forEach(async group => {
        await cognitoClient.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: username,
            GroupName: group,
          }),
        );
      });
    } else {
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: username,
          GroupName: groupName,
        }),
      );
    }
  }
}

export async function addUserToGroup(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  groupName?: string,
) {
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName,
    }),
  );
}

export function getConfiguredCognitoClient(region: string = process.env.CLI_REGION): CognitoIdentityProviderClient {
  const cognitoClient = new CognitoIdentityProviderClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });

  return cognitoClient;
}

export function getConfiguredAppsyncClientCognitoAuth(url: string, region: string, user: any): any {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
      jwtToken: user.signInUserSession.idToken.jwtToken,
    },
  });
}

export function getConfiguredAppsyncClientOIDCAuth(url: string, region: string, user: any): any {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.OPENID_CONNECT,
      jwtToken: user.signInUserSession.idToken.jwtToken,
    },
  });
}

export function getConfiguredAppsyncClientAPIKeyAuth(url: string, region: string, apiKey: string): any {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.API_KEY,
      apiKey,
    },
  });
}

export const getConfiguredAppsyncClientIAMAuth = (
  url: string,
  region: string,
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  },
): any => {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AWS_IAM,
      credentials: {
        accessKeyId: credentials?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: credentials?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: credentials?.sessionToken ?? process.env.AWS_SESSION_TOKEN,
      },
    },
  });
};

export const getConfiguredAppsyncClientLambdaAuth = (url: string, region: string, token: string): any => {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AWS_LAMBDA,
      token,
    },
  });
};

export async function signInUser(username: string, password: string) {
  const user = await Auth.signIn(username, password);
  return user;
}

export function configureAmplify(projectDir: string) {
  const awsconfig = getAWSExports(projectDir);
  Amplify.configure(awsconfig);
  return awsconfig;
}

export function getAWSExports(projectDir: string) {
  const awsExportsFilePath = path.join(projectDir, 'src', 'aws-exports.js');
  let fileContent = fs.readFileSync(awsExportsFilePath).toString();
  fileContent = '{' + fileContent.split('= {')[1].split('};')[0] + '}';
  return JSON.parse(fileContent);
}

export function getUserPoolId(projectDir: string): string {
  const amplifyMeta = getProjectMeta(projectDir);
  const cognitoResource = Object.values(amplifyMeta.auth).find((res: any) => {
    return res.service === 'Cognito';
  }) as any;
  return cognitoResource.output.UserPoolId;
}

export function getCognitoResourceName(projectDir: string): string {
  const amplifyMeta = getBackendAmplifyMeta(projectDir);
  const cognitoResourceName = Object.keys(amplifyMeta.auth).find((key: any) => {
    return amplifyMeta.auth[key].service === 'Cognito';
  }) as any;
  return cognitoResourceName;
}

export function getApiKey(projectDir: string): string {
  const amplifyMeta = getProjectMeta(projectDir);
  const appsyncResource = Object.values(amplifyMeta.api).find((res: any) => {
    return res.service === 'AppSync';
  }) as any;
  return appsyncResource.output.GraphQLAPIKeyOutput;
}

export async function authenticateUser(username: string, tempPassword: string, password: string) {
  const signinResult = await Auth.signIn(username, tempPassword);
  if (signinResult.challengeName === 'NEW_PASSWORD_REQUIRED') {
    const { requiredAttributes } = signinResult.challengeParam; // the array of required attributes, e.g [‘email’, ‘phone_number’]
    await Auth.completeNewPassword(signinResult, password, requiredAttributes);
  }
}

export function getUserPoolIssUrl(projectDir: string) {
  const amplifyMeta = getProjectMeta(projectDir);
  const cognitoResource = Object.values(amplifyMeta.auth).find((res: any) => {
    return res.service === 'Cognito';
  }) as any;

  const userPoolId = cognitoResource.output.UserPoolId;
  const region = amplifyMeta.providers.awscloudformation.Region;

  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/`;
}

export function getAppClientIDWeb(projectDir: string) {
  const amplifyMeta = getProjectMeta(projectDir);
  const cognitoResource = Object.values(amplifyMeta.auth).find((res: any) => {
    return res.service === 'Cognito';
  }) as any;

  return cognitoResource.output.AppClientIDWeb;
}
