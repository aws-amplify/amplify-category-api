"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParametersStack = void 0;
const graphql_transformer_common_1 = require("graphql-transformer-common");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constants_1 = require("../constants");
const createParametersStack = (scope) => {
    const { OpenSearchAccessIAMRoleName, OpenSearchStreamingLambdaHandlerName, OpenSearchStreamingLambdaRuntime, OpenSearchStreamingFunctionName, OpenSearchStreamBatchSize, OpenSearchStreamMaximumBatchingWindowInSeconds, OpenSearchStreamingIAMRoleName, OpenSearchDebugStreamingLambda, OpenSearchInstanceCount, OpenSearchInstanceType, OpenSearchEBSVolumeGB, } = graphql_transformer_common_1.ResourceConstants.PARAMETERS;
    return new Map([
        [
            OpenSearchAccessIAMRoleName,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchAccessIAMRoleName, {
                description: 'The name of the IAM role assumed by AppSync for OpenSearch.',
                default: 'AppSyncOpenSearchRole',
            }),
        ],
        [
            OpenSearchStreamingLambdaHandlerName,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchStreamingLambdaHandlerName, {
                description: 'The name of the lambda handler.',
                default: 'python_streaming_function.lambda_handler',
            }),
        ],
        [
            OpenSearchStreamingLambdaRuntime,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchStreamingLambdaRuntime, {
                description: 'The lambda runtime \
                (https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-Runtime)',
                default: 'python3.6',
            }),
        ],
        [
            OpenSearchStreamingFunctionName,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchStreamingFunctionName, {
                description: 'The name of the streaming lambda function.',
                default: 'DdbToEsFn',
            }),
        ],
        [
            OpenSearchStreamBatchSize,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchStreamBatchSize, {
                description: 'The maximum number of records to stream to OpenSearch per batch.',
                type: 'Number',
                default: 100,
            }),
        ],
        [
            OpenSearchStreamMaximumBatchingWindowInSeconds,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchStreamMaximumBatchingWindowInSeconds, {
                description: 'The maximum amount of time in seconds to wait for DynamoDB stream records before sending to streaming lambda.',
                type: 'Number',
                default: 1,
            }),
        ],
        [
            OpenSearchAccessIAMRoleName,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchStreamingIAMRoleName, {
                description: 'The name of the streaming lambda function IAM role.',
                default: 'SearchLambdaIAMRole',
            }),
        ],
        [
            OpenSearchDebugStreamingLambda,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchDebugStreamingLambda, {
                description: 'Enable debug logs for the Dynamo -> OpenSearch streaming lambda.',
                default: 0,
                type: 'Number',
                allowedValues: ['0', '1'],
            }),
        ],
        [
            OpenSearchInstanceCount,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchInstanceCount, {
                description: 'The number of instances to launch into the OpenSearch domain.',
                default: 1,
                type: 'Number',
            }),
        ],
        [
            OpenSearchInstanceType,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchInstanceType, {
                description: 'The type of instance to launch into the OpenSearch domain.',
                default: 't3.small.elasticsearch',
                allowedValues: constants_1.ALLOWABLE_SEARCHABLE_INSTANCE_TYPES,
            }),
        ],
        [
            OpenSearchEBSVolumeGB,
            new aws_cdk_lib_1.CfnParameter(scope, OpenSearchEBSVolumeGB, {
                description: 'The size in GB of the EBS volumes that contain our data.',
                default: 10,
                type: 'Number',
            }),
        ],
    ]);
};
exports.createParametersStack = createParametersStack;
//# sourceMappingURL=create-cfnParameters.js.map