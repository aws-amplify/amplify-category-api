import { ResourceConstants } from 'graphql-transformer-common';
import { CfnParameter, Stack } from 'aws-cdk-lib';
import {ALLOWABLE_SEARCHABLE_INSTANCE_TYPES} from '../constants';

export const createParametersStack = (stack: Stack): Map<string, CfnParameter> => {
  const {
    OpenSearchAccessIAMRoleName,
    OpenSearchStreamingLambdaHandlerName,
    OpenSearchStreamingLambdaRuntime,
    OpenSearchStreamingFunctionName,
    OpenSearchStreamBatchSize,
    OpenSearchStreamMaximumBatchingWindowInSeconds,
    OpenSearchStreamingIAMRoleName,
    OpenSearchDebugStreamingLambda,
    OpenSearchInstanceCount,
    OpenSearchInstanceType,
    OpenSearchEBSVolumeGB,
  } = ResourceConstants.PARAMETERS;

  return new Map<string, CfnParameter>([
    [
      OpenSearchAccessIAMRoleName,
      new CfnParameter(stack, OpenSearchAccessIAMRoleName, {
        description: 'The name of the IAM role assumed by AppSync for OpenSearch.',
        default: 'AppSyncOpenSearchRole',
      }),
    ],

    [
      OpenSearchStreamingLambdaHandlerName,
      new CfnParameter(stack, OpenSearchStreamingLambdaHandlerName, {
        description: 'The name of the lambda handler.',
        default: 'python_streaming_function.lambda_handler',
      }),
    ],

    [
      OpenSearchStreamingLambdaRuntime,
      new CfnParameter(stack, OpenSearchStreamingLambdaRuntime, {
        // eslint-disable-next-line no-multi-str
        description: 'The lambda runtime \
                (https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-Runtime)',
        default: 'python3.6',
      }),
    ],

    [
      OpenSearchStreamingFunctionName,
      new CfnParameter(stack, OpenSearchStreamingFunctionName, {
        description: 'The name of the streaming lambda function.',
        default: 'DdbToEsFn',
      }),
    ],

    [
      OpenSearchStreamBatchSize,
      new CfnParameter(stack, OpenSearchStreamBatchSize, {
        description: 'The maximum number of records to stream to OpenSearch per batch.',
        type: 'Number',
        default: 100,
      }),
    ],

    [
      OpenSearchStreamMaximumBatchingWindowInSeconds,
      new CfnParameter(stack, OpenSearchStreamMaximumBatchingWindowInSeconds, {
        description: 'The maximum amount of time in seconds to wait for DynamoDB stream records before sending to streaming lambda.',
        type: 'Number',
        default: 1,
      }),
    ],

    [
      OpenSearchAccessIAMRoleName,
      new CfnParameter(stack, OpenSearchStreamingIAMRoleName, {
        description: 'The name of the streaming lambda function IAM role.',
        default: 'SearchLambdaIAMRole',
      }),
    ],

    [
      OpenSearchDebugStreamingLambda,
      new CfnParameter(stack, OpenSearchDebugStreamingLambda, {
        description: 'Enable debug logs for the Dynamo -> OpenSearch streaming lambda.',
        default: 0,
        type: 'Number',
        allowedValues: ['0', '1'],
      }),
    ],

    [
      OpenSearchInstanceCount,
      new CfnParameter(stack, OpenSearchInstanceCount, {
        description: 'The number of instances to launch into the OpenSearch domain.',
        default: 1,
        type: 'Number',
      }),
    ],

    [
      OpenSearchInstanceType,
      new CfnParameter(stack, OpenSearchInstanceType, {
        description: 'The type of instance to launch into the OpenSearch domain.',
        default: 't2.small.elasticsearch',
        allowedValues: ALLOWABLE_SEARCHABLE_INSTANCE_TYPES,
      }),
    ],

    [
      OpenSearchEBSVolumeGB,
      new CfnParameter(stack, OpenSearchEBSVolumeGB, {
        description: 'The size in GB of the EBS volumes that contain our data.',
        default: 10,
        type: 'Number',
      }),
    ],
  ]);
};
