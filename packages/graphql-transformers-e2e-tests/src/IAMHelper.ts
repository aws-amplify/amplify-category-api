import { IAM, Credentials } from 'aws-sdk';
import { resolveTestRegion } from './testSetup';

const REGION = resolveTestRegion();

/**
 *
 */
export class IAMHelper {
  client: IAM;
  constructor(region: string = REGION, credentials?: Credentials) {
    this.client = new IAM({
      region,
      credentials,
    });
  }

  /**
   * Creates auth and unauth roles
   * @param authRoleName
   * @param unauthRoleName
   */
  async createRoles(authRoleName: string, unauthRoleName: string): Promise<{ authRole: IAM.Role; unauthRole: IAM.Role }> {
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
            "Action": "sts:AssumeRoleWithWebIdentity"
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
            "Action": "sts:AssumeRoleWithWebIdentity"
          }
        ]
      }`,
      })
      .promise();

    return { authRole: authRole.Role, unauthRole: unauthRole.Role };
  }

  /**
   *
   * @param name
   */
  async createRoleForCognitoGroup(name: string): Promise<IAM.Role> {
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
            "Action": "sts:AssumeRoleWithWebIdentity"
          }
        ]
      }`,
      })
      .promise();
    return role.Role;
  }

  /**
   *
   * @param name
   */
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

  /**
   *
   * @param name
   */
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

  /**
   *
   * @param policyArn
   * @param roleName
   */
  async attachLambdaExecutionPolicy(policyArn: string, roleName: string) {
    return await this.client
      .attachRolePolicy({
        PolicyArn: policyArn,
        RoleName: roleName,
      })
      .promise();
  }

  /**
   *
   * @param policyArn
   */
  async deletePolicy(policyArn: string) {
    return await this.client.deletePolicy({ PolicyArn: policyArn }).promise();
  }

  /**
   *
   * @param roleName
   */
  async deleteRole(roleName: string) {
    return await this.client.deleteRole({ RoleName: roleName }).promise();
  }

  /**
   *
   * @param policyArn
   * @param roleName
   */
  async detachLambdaExecutionPolicy(policyArn: string, roleName: string) {
    return await this.client
      .detachRolePolicy({
        PolicyArn: policyArn,
        RoleName: roleName,
      })
      .promise();
  }
}
