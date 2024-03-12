import { IAM, Credentials } from 'aws-sdk';
import { resolveTestRegion } from './testSetup';
import { default as STS } from 'aws-sdk/clients/sts';

const REGION = resolveTestRegion();

export class IAMHelper {
  client: IAM;
  sts = new STS();

  constructor(region: string = REGION, credentials?: Credentials) {
    this.client = new IAM({
      region,
      credentials,
    });
  }

  /**
   * Creates auth and unauth roles
   */
  async createRoles(
    authRoleName: string,
    unauthRoleName: string,
    identityPoolId: string,
  ): Promise<{ authRole: IAM.Role; unauthRole: IAM.Role }> {
    const authRole = await this.client
      .createRole({
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
      })
      .promise();
    const unauthRole = await this.client
      .createRole({
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
      })
      .promise();

    return { authRole: authRole.Role, unauthRole: unauthRole.Role };
  }

  async createRoleForCognitoGroup(name: string, identityPoolId: string): Promise<IAM.Role> {
    const role = await this.client
      .createRole({
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
      })
      .promise();
    return role.Role;
  }

  async createLambdaExecutionRole(name: string) {
    return await this.client
      .createRole({
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
      })
      .promise();
  }

  async createLambdaExecutionPolicy(name: string) {
    return await this.client
      .createPolicy({
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
      })
      .promise();
  }

  async attachPolicy(policyArn: string, roleName: string) {
    return await this.client
      .attachRolePolicy({
        PolicyArn: policyArn,
        RoleName: roleName,
      })
      .promise();
  }

  async deletePolicy(policyArn: string) {
    return await this.client.deletePolicy({ PolicyArn: policyArn }).promise();
  }

  async deleteRole(roleName: string) {
    return await this.client.deleteRole({ RoleName: roleName }).promise();
  }

  async detachPolicy(policyArn: string, roleName: string) {
    return await this.client
      .detachRolePolicy({
        PolicyArn: policyArn,
        RoleName: roleName,
      })
      .promise();
  }

  async createRole(name: string): Promise<IAM.Role> {
    const accountDetails = await this.sts.getCallerIdentity({}).promise();
    const currentAccountId = accountDetails.Account;
    const role = await this.client
      .createRole({
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
      })
      .promise();
    return role.Role;
  }

  async createAppSyncDataPolicy(policyName: string, region: string, appsyncApiIds: Array<string>) {
    const accountDetails = await this.sts.getCallerIdentity({}).promise();
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
    return await this.client
      .createPolicy({
        PolicyDocument: JSON.stringify(policyStatement),
        PolicyName: policyName,
      })
      .promise();
  }
}
