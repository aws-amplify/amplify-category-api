import * as fs from 'fs';
import * as path from 'path';
import { LambdaClient, CreateFunctionCommand, DeleteFunctionCommand, InvokeCommand, AddPermissionCommand } from '@aws-sdk/client-lambda';
import { resolveTestRegion } from './testSetup';

const REGION = resolveTestRegion();

export class LambdaHelper {
  client: LambdaClient;

  constructor(region: string = REGION, credentials?: any) {
    this.client = new LambdaClient({
      region,
      credentials,
    });
  }

  async createFunction(name: string, roleArn: string, filePrefix: string) {
    const filePath = path.join(__dirname, 'testfunctions', `${filePrefix}.zip`);
    const zipContents = fs.readFileSync(filePath);
    return await this.client.send(
      new CreateFunctionCommand({
        FunctionName: name,
        Code: {
          ZipFile: zipContents,
        },
        Runtime: 'nodejs20.x',
        Handler: `${filePrefix}.handler`,
        Role: roleArn,
      }),
    );
  }

  async deleteFunction(name: string) {
    return await this.client.send(new DeleteFunctionCommand({ FunctionName: name }));
  }

  async addAppSyncCrossAccountAccess(accountId: string, name: string) {
    await this.client.send(
      new AddPermissionCommand({
        Action: 'lambda:InvokeFunction',
        FunctionName: name,
        Principal: `arn:aws:iam::${accountId}:root`,
        StatementId: 'cross-account-appsync-lambda-access',
      }),
    );
  }
}
