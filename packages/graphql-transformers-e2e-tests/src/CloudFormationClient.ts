/* eslint-disable import/no-extraneous-dependencies */
import {
  CloudFormationClient as BaseCloudFormationClient,
  CreateStackCommand,
  CreateStackCommandInput,
  CreateStackCommandOutput,
  Parameter,
  DeleteStackCommand,
  DeleteStackCommandOutput,
  DescribeStacksCommand,
  UpdateStackCommand,
  UpdateStackCommandInput,
  UpdateStackCommandOutput,
  StackStatus,
  Stack,
} from '@aws-sdk/client-cloudformation';
import { ResourceConstants } from 'graphql-transformer-common';

export class CloudFormationClient {
  client: BaseCloudFormationClient;

  constructor(public region: string) {
    this.client = new BaseCloudFormationClient({ region: this.region });
  }

  buildParams(name: string, defParams: Record<string, string>, addAppSyncApiName: boolean): Parameter[] {
    const params: Parameter[] = [];

    if (addAppSyncApiName === true) {
      params.push({
        ParameterKey: ResourceConstants.PARAMETERS.AppSyncApiName,
        ParameterValue: name,
      });
    }

    for (const key of Object.keys(defParams)) {
      params.push({
        ParameterKey: key,
        ParameterValue: defParams[key],
      });
    }

    return params;
  }

  buildDeployInputs(
    name: string,
    defParams: Record<string, string>,
    addAppSyncApiName: boolean,
  ): CreateStackCommandInput & UpdateStackCommandInput {
    const params = this.buildParams(name, defParams, addAppSyncApiName);
    const templateURL = `https://s3.amazonaws.com/${defParams.S3DeploymentBucket}/${defParams.S3DeploymentRootKey}/rootStack.json`;
    return {
      StackName: name,
      Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
      Parameters: params,
      TemplateURL: templateURL,
    };
  }

  async updateStack(_template: any, name: string, defParams: any = {}, addAppSyncApiName = true): Promise<UpdateStackCommandOutput> {
    return this.client.send(new UpdateStackCommand(this.buildDeployInputs(name, defParams, addAppSyncApiName)));
  }

  async createStack(_template: any, name: string, defParams: any = {}, addAppSyncApiName = true): Promise<CreateStackCommandOutput> {
    return this.client.send(new CreateStackCommand(this.buildDeployInputs(name, defParams, addAppSyncApiName)));
  }

  async deleteStack(name: string): Promise<DeleteStackCommandOutput> {
    return this.client.send(
      new DeleteStackCommand({
        StackName: name,
      }),
    );
  }

  async describeStack(name: string): Promise<Stack | undefined> {
    return (
      await this.client.send(
        new DescribeStacksCommand({
          StackName: name,
        }),
      )
    ).Stacks?.[0];
  }

  /**
   * Periodically polls a stack waiting for a status change. If the status
   * changes to success then this resolves if it changes to error then it rejects.
   * @param name: The stack name to wait for
   * @param success: The status' that indicate success.
   * @param failure: The status' that indicate failure.
   * @param poll: The status' that indicate to keep polling.
   * @param maxPolls: The max number of times to poll.
   * @param pollInterval: The frequency of polling.
   */
  async waitForStack(
    name: string,
    success: StackStatus[] = ['CREATE_COMPLETE', 'ROLLBACK_COMPLETE', 'DELETE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'],
    failure: StackStatus[] = ['CREATE_FAILED', 'ROLLBACK_FAILED', 'DELETE_FAILED', 'UPDATE_ROLLBACK_FAILED'],
    poll: StackStatus[] = [
      'CREATE_IN_PROGRESS',
      'ROLLBACK_IN_PROGRESS',
      'UPDATE_IN_PROGRESS',
      'REVIEW_IN_PROGRESS',
      'DELETE_IN_PROGRESS',
      'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
      'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
      'UPDATE_ROLLBACK_IN_PROGRESS',
    ],
    maxPolls = 1000,
    pollInterval = 20,
  ): Promise<Stack> {
    let stack = await this.describeStack(name);
    if (!stack || !stack.StackStatus) {
      throw new Error(`Stack ${name} does not exist`);
    }

    for (let i = 0; i < maxPolls; i++) {
      if (success.includes(stack.StackStatus)) {
        return stack;
      } else if (failure.includes(stack.StackStatus)) {
        throw new Error(`Stack ${stack.StackName} failed with status "${stack.StackStatus}"`);
      } else if (poll.includes(stack.StackStatus)) {
        await sleepSecs(pollInterval);
      } else {
        throw new Error(`Invalid stack status: ${stack.StackStatus}`);
      }

      stack = await this.describeStack(name);
      if (!stack || !stack.StackStatus) {
        throw new Error(`Stack ${name} does not exist`);
      }
    }
    throw new Error(`Invalid stack status: ${stack.StackStatus}`);
  }

  /**
   * Promise wrapper around setTimeout.
   * @param secs The number of seconds to wait.
   * @param fun The function to call after waiting.
   * @param args The arguments to pass to the function after the wait.
   */
  public async wait<T>(secs: number, fun: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    return new Promise<T>((resolve) => {
      setTimeout(() => {
        resolve(fun.apply(this, args));
      }, 1000 * secs);
    });
  }
}

export function sleepSecs(s: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, s * 1000);
  });
}
