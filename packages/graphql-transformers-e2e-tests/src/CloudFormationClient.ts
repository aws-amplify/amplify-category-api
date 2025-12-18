/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */
import {
  CloudFormationClient as CFClient,
  CreateStackCommand,
  UpdateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  type DescribeStacksOutput,
  type StackStatus,
  type Stack,
} from '@aws-sdk/client-cloudformation';
import { ResourceConstants } from 'graphql-transformer-common';

export class CloudFormationClient {
  client: CFClient;

  constructor(public region: string) {
    this.client = new CFClient({ region: this.region });
  }

  async updateStack(_template: any, name: string, defParams: any = {}, addAppSyncApiName = true) {
    return this.createStack(_template, name, defParams, addAppSyncApiName, true);
  }

  async createStack(_template: any, name: string, defParams: any = {}, addAppSyncApiName = true, isUpdate = false) {
    const params = [];

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

    const templateURL = `https://s3.amazonaws.com/${defParams.S3DeploymentBucket}/${defParams.S3DeploymentRootKey}/rootStack.json`;

    const command = isUpdate
      ? new UpdateStackCommand({
          StackName: name,
          Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
          Parameters: params,
          TemplateURL: templateURL,
        })
      : new CreateStackCommand({
          StackName: name,
          Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
          Parameters: params,
          TemplateURL: templateURL,
        });

    return this.client.send(command);
  }

  async deleteStack(name: string) {
    return this.client.send(new DeleteStackCommand({ StackName: name }));
  }

  async describeStack(name: string): Promise<Stack> {
    const result = await this.client.send(new DescribeStacksCommand({ StackName: name }));
    if (!result.Stacks || result.Stacks.length !== 1) {
      throw new Error(`No stack named: ${name}`);
    }
    return result.Stacks[0];
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
    success: StackStatus[] = ['CREATE_COMPLETE', 'DELETE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'],
    failure: StackStatus[] = ['CREATE_FAILED', 'ROLLBACK_COMPLETE', 'ROLLBACK_FAILED', 'DELETE_FAILED', 'UPDATE_ROLLBACK_FAILED'],
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
