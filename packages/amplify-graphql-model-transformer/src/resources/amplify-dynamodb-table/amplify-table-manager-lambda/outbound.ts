// The contents of this file were taken from the AWS CDK provider framework.
// https://github.com/aws/aws-cdk/blob/c52ff08/packages/aws-cdk-lib/custom-resources/lib/provider-framework/runtime/outbound.ts

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable prefer-const */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */
import * as https from 'https';
import { SFN, StartExecutionInput, StartExecutionOutput } from '@aws-sdk/client-sfn';

const FRAMEWORK_HANDLER_TIMEOUT = 900000; // 15 minutes

// In order to honor the overall maximum timeout set for the target process,
// the default 2 minutes from AWS SDK has to be overriden:
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#httpOptions-property
const awsSdkConfig = {
  httpOptions: { timeout: FRAMEWORK_HANDLER_TIMEOUT },
};

async function defaultHttpRequest(options: https.RequestOptions, responseBody: string) {
  return new Promise((resolve, reject) => {
    try {
      const request = https.request(options, resolve);
      request.on('error', reject);
      request.write(responseBody);
      request.end();
    } catch (e) {
      reject(e);
    }
  });
}

let sfn: SFN;

async function defaultStartExecution(req: StartExecutionInput): Promise<StartExecutionOutput> {
  if (!sfn) {
    sfn = new SFN(awsSdkConfig);
  }

  return sfn.startExecution(req);
}

export let startExecution = defaultStartExecution;
export let httpRequest = defaultHttpRequest;
