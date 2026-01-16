/* eslint-disable import/no-extraneous-dependencies */
import * as fs from 'fs';
import * as path from 'path';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import {
  LambdaClient,
  AddPermissionCommand,
  AddPermissionCommandOutput,
  CreateFunctionCommand,
  CreateFunctionCommandOutput,
  DeleteFunctionCommand,
  DeleteAliasCommandOutput,
} from '@aws-sdk/client-lambda';
import { resolveTestRegion } from './testSetup';

const REGION = resolveTestRegion();

export class LambdaHelper {
  client: LambdaClient;

  constructor(region: string = REGION, credentials?: AwsCredentialIdentity) {
    this.client = new LambdaClient({
      region,
      credentials,
    });
  }

  async createFunction(name: string, roleArn: string, filePrefix: string): Promise<CreateFunctionCommandOutput> {
    const filePath = path.join(__dirname, 'testfunctions', `${filePrefix}.zip`);
    const zipContents = fs.readFileSync(filePath);
    return await this.client.send(
      new CreateFunctionCommand({
        FunctionName: name,
        Code: {
          ZipFile: zipContents,
        },
        Runtime: 'nodejs24.x',
        Handler: `${filePrefix}.handler`,
        Role: roleArn,
      }),
    );
  }

  async deleteFunction(name: string): Promise<DeleteAliasCommandOutput> {
    return await this.client.send(new DeleteFunctionCommand({ FunctionName: name }));
  }

  async addAppSyncCrossAccountAccess(accountId: string, name: string): Promise<AddPermissionCommandOutput> {
    return await this.client.send(
      new AddPermissionCommand({
        Action: 'lambda:InvokeFunction',
        FunctionName: name,
        Principal: `arn:aws:iam::${accountId}:root`,
        StatementId: 'cross-account-appsync-lambda-access',
      }),
    );
  }
}
