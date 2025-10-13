/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */
import { CloudFormation } from 'aws-sdk';
import { DescribeStacksOutput, StackStatus } from 'aws-sdk/clients/cloudformation';
import { ResourceConstants } from 'graphql-transformer-common';

async function promisify<I, O>(fun: (arg: I, cb: (e: Error, d: O) => void) => void, args: I, that: any): Promise<O> {
  return new Promise<O>((resolve, reject) => {
    fun.apply(that, [
      args,
      (err: Error, data: O) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      },
    ]);
  });
}

export class CloudFormationClient {
  client: CloudFormation;

  constructor(public region: string) {
    this.client = new CloudFormation({ apiVersion: '2010-05-15', region: this.region });
  }

  async updateStack(template: any, name: string, defParams: any = {}, addAppSyncApiName = true) {
    return this.createStack(template, name, defParams, addAppSyncApiName, true);
  }

  async createStack(template: any, name: string, defParams: any = {}, addAppSyncApiName = true, isUpdate = false) {
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

    return promisify<CloudFormation.Types.CreateStackInput, CloudFormation.Types.CreateStackOutput>(
      isUpdate ? this.client.updateStack : this.client.createStack,
      {
        StackName: name,
        Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
        Parameters: params,
        TemplateURL: templateURL,
      },
      this.client,
    );
  }

  async deleteStack(name: string) {
    return promisify<CloudFormation.Types.DeleteStackInput, {}>(this.client.deleteStack, { StackName: name }, this.client);
  }

  async describeStack(name: string): Promise<CloudFormation.Stack> {
    return new Promise<CloudFormation.Stack>((resolve, reject) => {
      this.client.describeStacks(
        {
          StackName: name,
        },
        (err: Error, data: DescribeStacksOutput) => {
          if (err) {
            return reject(err);
          }
          if (data.Stacks.length !== 1) {
            return reject(new Error(`No stack named: ${name}`));
          }
          resolve(data.Stacks[0]);
        },
      );
    });
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
  ): Promise<CloudFormation.Stack> {
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
