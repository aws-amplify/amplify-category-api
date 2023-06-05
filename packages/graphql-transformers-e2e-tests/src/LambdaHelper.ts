import { Credentials, Lambda } from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { resolveTestRegion } from './testSetup';

const REGION = resolveTestRegion();

/**
 *
 */
export class LambdaHelper {
  client: Lambda;
  constructor(region: string = REGION, credentials?: Credentials) {
    this.client = new Lambda({
      region,
      credentials,
    });
  }

  /**
   *
   * @param name
   * @param roleArn
   * @param filePrefix
   */
  async createFunction(name: string, roleArn: string, filePrefix: string) {
    const filePath = path.join(__dirname, 'testfunctions', `${filePrefix}.zip`);
    const zipContents = fs.readFileSync(filePath);
    return await this.client
      .createFunction({
        FunctionName: name,
        Code: {
          ZipFile: zipContents,
        },
        Runtime: 'nodejs14.x',
        Handler: `${filePrefix}.handler`,
        Role: roleArn,
      })
      .promise();
  }

  /**
   *
   * @param name
   */
  async deleteFunction(name: string) {
    return await this.client.deleteFunction({ FunctionName: name }).promise();
  }

  /**
   *
   * @param accountId
   * @param name
   */
  async addAppSyncCrossAccountAccess(accountId: string, name: string) {
    await this.client.addPermission({
      Action: 'lambda:InvokeFunction',
      FunctionName: name,
      Principal: `arn:aws:iam::${accountId}:root`,
      StatementId: 'cross-account-appsync-lambda-access',
    }).promise();
  }
}
