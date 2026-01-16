/* eslint-disable import/no-extraneous-dependencies */
import { AwsCredentialIdentity } from '@aws-sdk/types';
import {
  IAMClient,
  AttachRolePolicyCommand,
  AttachRolePolicyCommandOutput,
  CreatePolicyCommand,
  CreatePolicyCommandOutput,
  CreateRoleCommand,
  CreateRoleCommandOutput,
  DeletePolicyCommand,
  DeletePolicyCommandOutput,
  DeleteRoleCommand,
  DeleteRoleCommandOutput,
  DetachRolePolicyCommand,
  DetachRolePolicyCommandOutput,
  Role,
} from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { resolveTestRegion } from './testSetup';

const REGION = resolveTestRegion();

export class IAMHelper {
  client: IAMClient;
  sts = new STSClient();

  constructor(region: string = REGION, credentials?: AwsCredentialIdentity) {
    this.client = new IAMClient({
      region,
      credentials,
    });
  }

  /**
   * Creates auth and unauth roles
   */
  async createRoles(authRoleName: string, unauthRoleName: string, identityPoolId: string): Promise<{ authRole: Role; unauthRole: Role }> {
    const authRole = await this.client.send(
      new CreateRoleCommand({
        RoleName: authRoleName,
        AssumeRolePolicyDocument: `{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Federated": "cognito-identity.amazonaws.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
              "StringEquals": {
                "cognito-identity.amazonaws.com:aud": "${identityPoolId}"
              },
              "ForAnyValue:StringLike": {
                "cognito-identity.amazonaws.com:amr": "authenticated"
              }
            }
          }
        ]
      }`,
      }),
    );
    const unauthRole = await this.client.send(
      new CreateRoleCommand({
        RoleName: unauthRoleName,
        AssumeRolePolicyDocument: `{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Federated": "cognito-identity.amazonaws.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
              "StringEquals": {
                "cognito-identity.amazonaws.com:aud": "${identityPoolId}"
              },
              "ForAnyValue:StringLike": {
                "cognito-identity.amazonaws.com:amr": "unauthenticated"
              }
            }
          }
        ]
      }`,
      }),
    );

    return { authRole: authRole.Role!, unauthRole: unauthRole.Role! };
  }

  async createRoleForCognitoGroup(name: string, identityPoolId: string): Promise<Role> {
    const role = await this.client.send(
      new CreateRoleCommand({
        RoleName: name,
        AssumeRolePolicyDocument: `{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Federated": "cognito-identity.amazonaws.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
              "StringEquals": {
                "cognito-identity.amazonaws.com:aud": "${identityPoolId}"
              },
              "ForAnyValue:StringLike": {
                "cognito-identity.amazonaws.com:amr": "authenticated"
              }
            }
          }
        ]
      }`,
      }),
    );
    return role.Role;
  }

  async createLambdaExecutionRole(name: string): Promise<CreateRoleCommandOutput> {
    return await this.client.send(
      new CreateRoleCommand({
        AssumeRolePolicyDocument: `{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }`,
        RoleName: name,
      }),
    );
  }

  async createLambdaExecutionPolicy(name: string): Promise<CreatePolicyCommandOutput> {
    return await this.client.send(
      new CreatePolicyCommand({
        PolicyDocument: `{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents"
                        ],
                        "Resource": "arn:aws:logs:*:*:*"
                    }
                ]
            }`,
        PolicyName: name,
      }),
    );
  }

  async attachPolicy(policyArn: string, roleName: string): Promise<AttachRolePolicyCommandOutput> {
    return await this.client.send(
      new AttachRolePolicyCommand({
        PolicyArn: policyArn,
        RoleName: roleName,
      }),
    );
  }

  async deletePolicy(policyArn: string): Promise<DeletePolicyCommandOutput> {
    return await this.client.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
  }

  async deleteRole(roleName: string): Promise<DeleteRoleCommandOutput> {
    return await this.client.send(new DeleteRoleCommand({ RoleName: roleName }));
  }

  async detachPolicy(policyArn: string, roleName: string): Promise<DetachRolePolicyCommandOutput> {
    return await this.client.send(
      new DetachRolePolicyCommand({
        PolicyArn: policyArn,
        RoleName: roleName,
      }),
    );
  }

  async createRole(name: string): Promise<Role> {
    const accountDetails = await this.sts.send(new GetCallerIdentityCommand());
    const currentAccountId = accountDetails.Account;
    const role = await this.client.send(
      new CreateRoleCommand({
        RoleName: name,
        AssumeRolePolicyDocument: `{
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": "sts:AssumeRole",
              "Principal": {
                "AWS": "${currentAccountId}"
              },
              "Condition": {}
            }
          ]
        }`,
      }),
    );
    return role.Role!;
  }

  async createAppSyncDataPolicy(policyName: string, region: string, appsyncApiIds: Array<string>): Promise<CreatePolicyCommandOutput> {
    const accountDetails = await this.sts.send(new GetCallerIdentityCommand());
    const currentAccountId = accountDetails.Account;
    const policyStatement = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['appsync:GraphQL'],
          Resource: appsyncApiIds.map((appsyncApiId) => `arn:aws:appsync:${region}:${currentAccountId}:apis/${appsyncApiId}/*`),
        },
      ],
    };
    return await this.client.send(
      new CreatePolicyCommand({
        PolicyDocument: JSON.stringify(policyStatement),
        PolicyName: policyName,
      }),
    );
  }
}
