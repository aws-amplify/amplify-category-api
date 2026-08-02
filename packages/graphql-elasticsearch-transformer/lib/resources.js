"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceFactory = void 0;
const appSync_1 = __importDefault(require("cloudform-types/types/appSync"));
const iam_1 = __importDefault(require("cloudform-types/types/iam"));
const cloudform_types_1 = require("cloudform-types");
const graphql_mapping_template_1 = require("graphql-mapping-template");
const graphql_transformer_common_1 = require("graphql-transformer-common");
class ResourceFactory {
    constructor() {
        this.getSourceMapper = (includeVersion) => {
            if (includeVersion) {
                return [
                    (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('row'), (0, graphql_mapping_template_1.methodCall)((0, graphql_mapping_template_1.ref)('entry.get'), (0, graphql_mapping_template_1.str)('_source'))),
                    (0, graphql_mapping_template_1.qref)('$row.put("_version", $entry.get("_version"))'),
                    (0, graphql_mapping_template_1.qref)('$es_items.add($row)'),
                ];
            }
            return [(0, graphql_mapping_template_1.qref)('$es_items.add($entry.get("_source"))')];
        };
    }
    makeParams() {
        return {
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchAccessIAMRoleName]: new cloudform_types_1.StringParameter({
                Description: 'The name of the IAM role assumed by AppSync for Elasticsearch.',
                Default: 'AppSyncElasticsearchRole',
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingLambdaHandlerName]: new cloudform_types_1.StringParameter({
                Description: 'The name of the lambda handler.',
                Default: 'python_streaming_function.lambda_handler',
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingLambdaRuntime]: new cloudform_types_1.StringParameter({
                Description: 'The lambda runtime \
                (https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-Runtime)',
                Default: 'python3.12',
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingFunctionName]: new cloudform_types_1.StringParameter({
                Description: 'The name of the streaming lambda function.',
                Default: 'DdbToEsFn',
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingIAMRoleName]: new cloudform_types_1.StringParameter({
                Description: 'The name of the streaming lambda function IAM role.',
                Default: 'SearchableLambdaIAMRole',
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchDebugStreamingLambda]: new cloudform_types_1.NumberParameter({
                Description: 'Enable debug logs for the Dynamo -> ES streaming lambda.',
                Default: 1,
                AllowedValues: [0, 1],
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchInstanceCount]: new cloudform_types_1.NumberParameter({
                Description: 'The number of instances to launch into the Elasticsearch domain.',
                Default: 1,
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchInstanceType]: new cloudform_types_1.StringParameter({
                Description: 'The type of instance to launch into the Elasticsearch domain.',
                Default: 't3.small.elasticsearch',
                AllowedValues: [
                    't3.small.elasticsearch',
                    't3.medium.elasticsearch',
                    'c4.large.elasticsearch',
                    'c4.xlarge.elasticsearch',
                    'c4.2xlarge.elasticsearch',
                    'c4.4xlarge.elasticsearch',
                    'c4.8xlarge.elasticsearch',
                    'm3.medium.elasticsearch',
                    'm3.large.elasticsearch',
                    'm3.xlarge.elasticsearch',
                    'm3.2xlarge.elasticsearch',
                    'm4.large.elasticsearch',
                    'm4.xlarge.elasticsearch',
                    'm4.2xlarge.elasticsearch',
                    'm4.4xlarge.elasticsearch',
                    'm4.10xlarge.elasticsearch',
                    'r3.large.elasticsearch',
                    'r3.xlarge.elasticsearch',
                    'r3.2xlarge.elasticsearch',
                    'r3.4xlarge.elasticsearch',
                    'r3.8xlarge.elasticsearch',
                    'r4.large.elasticsearch',
                    'r4.xlarge.elasticsearch',
                    'r4.2xlarge.elasticsearch',
                    'r4.4xlarge.elasticsearch',
                    'r4.8xlarge.elasticsearch',
                    'r4.16xlarge.elasticsearch',
                    'i2.xlarge.elasticsearch',
                    'i2.2xlarge.elasticsearch',
                    'i3.large.elasticsearch',
                    'i3.xlarge.elasticsearch',
                    'i3.2xlarge.elasticsearch',
                    'i3.4xlarge.elasticsearch',
                    'i3.8xlarge.elasticsearch',
                    'i3.16xlarge.elasticsearch',
                    'r6gd.12xlarge.elasticsearch',
                    'ultrawarm1.xlarge.elasticsearch',
                    'm5.4xlarge.elasticsearch',
                    't3.xlarge.elasticsearch',
                    'm6g.xlarge.elasticsearch',
                    'm6g.12xlarge.elasticsearch',
                    'r6gd.16xlarge.elasticsearch',
                    'd2.2xlarge.elasticsearch',
                    't3.micro.elasticsearch',
                    'm5.large.elasticsearch',
                    'd2.4xlarge.elasticsearch',
                    'c5.2xlarge.elasticsearch',
                    'c6g.2xlarge.elasticsearch',
                    'd2.8xlarge.elasticsearch',
                    'c5.4xlarge.elasticsearch',
                    't4g.medium.elasticsearch',
                    'c6g.4xlarge.elasticsearch',
                    'c6g.xlarge.elasticsearch',
                    'c6g.12xlarge.elasticsearch',
                    'c5.xlarge.elasticsearch',
                    'c5.large.elasticsearch',
                    't4g.small.elasticsearch',
                    'c5.9xlarge.elasticsearch',
                    'c6g.8xlarge.elasticsearch',
                    'c6g.large.elasticsearch',
                    'd2.xlarge.elasticsearch',
                    'ultrawarm1.medium.elasticsearch',
                    't3.nano.elasticsearch',
                    'm6g.2xlarge.elasticsearch',
                    't3.2xlarge.elasticsearch',
                    'c5.18xlarge.elasticsearch',
                    'm6g.4xlarge.elasticsearch',
                    'r6gd.2xlarge.elasticsearch',
                    'm5.xlarge.elasticsearch',
                    'r6gd.4xlarge.elasticsearch',
                    'r6g.2xlarge.elasticsearch',
                    'r5.2xlarge.elasticsearch',
                    'm5.12xlarge.elasticsearch',
                    'm6g.8xlarge.elasticsearch',
                    'm6g.large.elasticsearch',
                    'm5.24xlarge.elasticsearch',
                    'r6g.4xlarge.elasticsearch',
                    't3.large.elasticsearch',
                    'r5.4xlarge.elasticsearch',
                    'ultrawarm1.large.elasticsearch',
                    'r6gd.8xlarge.elasticsearch',
                    'r6gd.large.elasticsearch',
                    'r6g.xlarge.elasticsearch',
                    'r5.xlarge.elasticsearch',
                    'r6g.12xlarge.elasticsearch',
                    'r5.12xlarge.elasticsearch',
                    'm5.2xlarge.elasticsearch',
                    'r6gd.xlarge.elasticsearch',
                    'r6g.8xlarge.elasticsearch',
                    'r6g.large.elasticsearch',
                    'r5.24xlarge.elasticsearch',
                    'r5.large.elasticsearch',
                ],
            }),
            [graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchEBSVolumeGB]: new cloudform_types_1.NumberParameter({
                Description: 'The size in GB of the EBS volumes that contain our data.',
                Default: 10,
            }),
        };
    }
    initTemplate(isProjectUsingDataStore = false) {
        return {
            Parameters: this.makeParams(),
            Resources: {
                [graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchAccessIAMRoleLogicalID]: this.makeElasticsearchAccessIAMRole(),
                [graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDataSourceLogicalID]: this.makeElasticsearchDataSource(),
                [graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID]: this.makeElasticsearchDomain(),
                [graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaIAMRoleLogicalID]: this.makeStreamingLambdaIAMRole(),
                [graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaFunctionLogicalID]: this.makeDynamoDBStreamingFunction(isProjectUsingDataStore),
            },
            Mappings: this.getLayerMapping(),
            Outputs: {
                [graphql_transformer_common_1.ResourceConstants.OUTPUTS.ElasticsearchDomainArn]: this.makeDomainArnOutput(),
                [graphql_transformer_common_1.ResourceConstants.OUTPUTS.ElasticsearchDomainEndpoint]: this.makeDomainEndpointOutput(),
            },
        };
    }
    makeElasticsearchDataSource() {
        const logicalName = graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID;
        return new appSync_1.default.DataSource({
            ApiId: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
            Name: logicalName,
            Type: 'AMAZON_ELASTICSEARCH',
            ServiceRoleArn: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchAccessIAMRoleLogicalID, 'Arn'),
            ElasticsearchConfig: {
                AwsRegion: cloudform_types_1.Fn.Select(3, cloudform_types_1.Fn.Split(':', cloudform_types_1.Fn.GetAtt(logicalName, 'DomainArn'))),
                Endpoint: cloudform_types_1.Fn.Join('', ['https://', cloudform_types_1.Fn.GetAtt(logicalName, 'DomainEndpoint')]),
            },
        }).dependsOn(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID);
    }
    getLayerMapping() {
        return {
            LayerResourceMapping: {
                'ap-northeast-1': {
                    layerRegion: 'arn:aws:lambda:ap-northeast-1:249908578461:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'us-east-1': {
                    layerRegion: 'arn:aws:lambda:us-east-1:668099181075:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ap-southeast-1': {
                    layerRegion: 'arn:aws:lambda:ap-southeast-1:468957933125:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'eu-west-1': {
                    layerRegion: 'arn:aws:lambda:eu-west-1:399891621064:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'us-west-1': {
                    layerRegion: 'arn:aws:lambda:us-west-1:325793726646:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ap-east-1': {
                    layerRegion: 'arn:aws:lambda:ap-east-1:118857876118:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ap-northeast-2': {
                    layerRegion: 'arn:aws:lambda:ap-northeast-2:296580773974:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ap-northeast-3': {
                    layerRegion: 'arn:aws:lambda:ap-northeast-3:961244031340:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ap-south-1': {
                    layerRegion: 'arn:aws:lambda:ap-south-1:631267018583:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ap-southeast-2': {
                    layerRegion: 'arn:aws:lambda:ap-southeast-2:817496625479:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'ca-central-1': {
                    layerRegion: 'arn:aws:lambda:ca-central-1:778625758767:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'eu-central-1': {
                    layerRegion: 'arn:aws:lambda:eu-central-1:292169987271:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'eu-north-1': {
                    layerRegion: 'arn:aws:lambda:eu-north-1:642425348156:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'eu-south-1': {
                    layerRegion: 'arn:aws:lambda:eu-south-1:426215560912:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'eu-west-2': {
                    layerRegion: 'arn:aws:lambda:eu-west-2:142628438157:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'eu-west-3': {
                    layerRegion: 'arn:aws:lambda:eu-west-3:959311844005:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'sa-east-1': {
                    layerRegion: 'arn:aws:lambda:sa-east-1:640010853179:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'us-east-2': {
                    layerRegion: 'arn:aws:lambda:us-east-2:259788987135:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'us-west-2': {
                    layerRegion: 'arn:aws:lambda:us-west-2:420165488524:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'cn-north-1': {
                    layerRegion: 'arn:aws-cn:lambda:cn-north-1:683298794825:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'cn-northwest-1': {
                    layerRegion: 'arn:aws-cn:lambda:cn-northwest-1:382066503313:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'us-gov-west-1': {
                    layerRegion: 'arn:aws-us-gov:lambda:us-gov-west-1:556739011827:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'us-gov-east-1': {
                    layerRegion: 'arn:aws-us-gov:lambda:us-gov-east-1:138526772879:layer:AWSLambda-Python-AWS-SDK:1',
                },
                'me-south-1': {
                    layerRegion: 'arn:aws:lambda:me-south-1:507411403535:layer:AWSLambda-Python-AWS-SDK:1',
                },
            },
        };
    }
    makeDynamoDBStreamingFunction(isProjectUsingDataStore = false) {
        return new cloudform_types_1.Lambda.Function({
            Code: {
                S3Bucket: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.S3DeploymentBucket),
                S3Key: cloudform_types_1.Fn.Join('/', [
                    cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.S3DeploymentRootKey),
                    'functions',
                    cloudform_types_1.Fn.Join('.', [graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaFunctionLogicalID, 'zip']),
                ]),
            },
            FunctionName: this.joinWithEnv('-', [
                cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingFunctionName),
                cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
            ]),
            Handler: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingLambdaHandlerName),
            Role: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaIAMRoleLogicalID, 'Arn'),
            Runtime: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingLambdaRuntime),
            Layers: [cloudform_types_1.Fn.FindInMap('LayerResourceMapping', cloudform_types_1.Fn.Ref('AWS::Region'), 'layerRegion')],
            Environment: {
                Variables: {
                    ES_ENDPOINT: cloudform_types_1.Fn.Join('', ['https://', cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID, 'DomainEndpoint')]),
                    ES_REGION: cloudform_types_1.Fn.Select(3, cloudform_types_1.Fn.Split(':', cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID, 'DomainArn'))),
                    DEBUG: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchDebugStreamingLambda),
                    ES_USE_EXTERNAL_VERSIONING: isProjectUsingDataStore.toString(),
                },
            },
        }).dependsOn([
            graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaIAMRoleLogicalID,
            graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID,
        ]);
    }
    makeDynamoDBStreamEventSourceMapping(typeName) {
        return new cloudform_types_1.Lambda.EventSourceMapping({
            BatchSize: 1,
            Enabled: true,
            EventSourceArn: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ModelResourceIDs.ModelTableResourceID(typeName), 'StreamArn'),
            FunctionName: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaFunctionLogicalID, 'Arn'),
            StartingPosition: 'LATEST',
        }).dependsOn([graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchStreamingLambdaFunctionLogicalID]);
    }
    joinWithEnv(separator, listToJoin) {
        return cloudform_types_1.Fn.If(graphql_transformer_common_1.ResourceConstants.CONDITIONS.HasEnvironmentParameter, cloudform_types_1.Fn.Join(separator, [...listToJoin, cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.Env)]), cloudform_types_1.Fn.Join(separator, listToJoin));
    }
    makeElasticsearchAccessIAMRole() {
        return new iam_1.default.Role({
            RoleName: this.joinWithEnv('-', [
                cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchAccessIAMRoleName),
                cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
            ]),
            AssumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: {
                            Service: 'appsync.amazonaws.com',
                        },
                        Action: 'sts:AssumeRole',
                    },
                ],
            },
            Policies: [
                new iam_1.default.Role.Policy({
                    PolicyName: 'ElasticsearchAccess',
                    PolicyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Action: ['es:ESHttpPost', 'es:ESHttpDelete', 'es:ESHttpHead', 'es:ESHttpGet', 'es:ESHttpPost', 'es:ESHttpPut'],
                                Effect: 'Allow',
                                Resource: cloudform_types_1.Fn.Join('', [this.domainArn(), '/*']),
                            },
                        ],
                    },
                }),
            ],
        });
    }
    makeStreamingLambdaIAMRole() {
        return new iam_1.default.Role({
            RoleName: this.joinWithEnv('-', [
                cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchStreamingIAMRoleName),
                cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
            ]),
            AssumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: {
                            Service: 'lambda.amazonaws.com',
                        },
                        Action: 'sts:AssumeRole',
                    },
                ],
            },
            Policies: [
                new iam_1.default.Role.Policy({
                    PolicyName: 'ElasticsearchAccess',
                    PolicyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Action: ['es:ESHttpPost', 'es:ESHttpDelete', 'es:ESHttpHead', 'es:ESHttpGet', 'es:ESHttpPost', 'es:ESHttpPut'],
                                Effect: 'Allow',
                                Resource: cloudform_types_1.Fn.Join('', [this.domainArn(), '/*']),
                            },
                        ],
                    },
                }),
                new iam_1.default.Role.Policy({
                    PolicyName: 'DynamoDBStreamAccess',
                    PolicyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Action: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:ListStreams'],
                                Effect: 'Allow',
                                Resource: [
                                    '*',
                                ],
                            },
                        ],
                    },
                }),
                new iam_1.default.Role.Policy({
                    PolicyName: 'CloudWatchLogsAccess',
                    PolicyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Effect: 'Allow',
                                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                                Resource: 'arn:aws:logs:*:*:*',
                            },
                        ],
                    },
                }),
            ],
        });
    }
    domainName() {
        return cloudform_types_1.Fn.If(graphql_transformer_common_1.ResourceConstants.CONDITIONS.HasEnvironmentParameter, cloudform_types_1.Refs.NoValue, cloudform_types_1.Fn.Join('-', ['d', cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId')]));
    }
    domainArn() {
        return cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID, 'DomainArn');
    }
    makeElasticsearchDomain() {
        return new cloudform_types_1.Elasticsearch.Domain({
            DomainName: this.domainName(),
            ElasticsearchVersion: '6.2',
            ElasticsearchClusterConfig: {
                ZoneAwarenessEnabled: false,
                InstanceCount: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchInstanceCount),
                InstanceType: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchInstanceType),
            },
            EBSOptions: {
                EBSEnabled: true,
                VolumeType: 'gp2',
                VolumeSize: cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.ElasticsearchEBSVolumeGB),
            },
        });
    }
    makeSearchResolver(type, nonKeywordFields, primaryKey, queryTypeName, improvePluralization, nameOverride, includeVersion = false) {
        const fieldName = nameOverride || (0, graphql_transformer_common_1.graphqlName)(`search${(0, graphql_transformer_common_1.plurality)((0, graphql_transformer_common_1.toUpper)(type), improvePluralization)}`);
        return new appSync_1.default.Resolver({
            ApiId: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
            DataSourceName: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDataSourceLogicalID, 'Name'),
            FieldName: fieldName,
            TypeName: queryTypeName,
            RequestMappingTemplate: (0, graphql_mapping_template_1.print)((0, graphql_mapping_template_1.compoundExpression)([
                (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('indexPath'), (0, graphql_mapping_template_1.str)(`/${type.toLowerCase()}/doc/_search`)),
                (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('nonKeywordFields'), (0, graphql_mapping_template_1.list)(nonKeywordFields)),
                (0, graphql_mapping_template_1.ifElse)((0, graphql_mapping_template_1.ref)('util.isNullOrEmpty($context.args.sort)'), (0, graphql_mapping_template_1.compoundExpression)([(0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('sortDirection'), (0, graphql_mapping_template_1.str)('desc')), (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('sortField'), (0, graphql_mapping_template_1.str)(primaryKey))]), (0, graphql_mapping_template_1.compoundExpression)([
                    (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('sortDirection'), (0, graphql_mapping_template_1.ref)('util.defaultIfNull($context.args.sort.direction, "desc")')),
                    (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('sortField'), (0, graphql_mapping_template_1.ref)(`util.defaultIfNull($context.args.sort.field, "${primaryKey}")`)),
                ])),
                (0, graphql_mapping_template_1.ifElse)((0, graphql_mapping_template_1.ref)('nonKeywordFields.contains($sortField)'), (0, graphql_mapping_template_1.compoundExpression)([(0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('sortField0'), (0, graphql_mapping_template_1.ref)('util.toJson($sortField)'))]), (0, graphql_mapping_template_1.compoundExpression)([(0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('sortField0'), (0, graphql_mapping_template_1.ref)('util.toJson("${sortField}.keyword")'))])),
                graphql_mapping_template_1.ElasticsearchMappingTemplate.searchItem({
                    path: (0, graphql_mapping_template_1.str)('$indexPath'),
                    size: (0, graphql_mapping_template_1.ifElse)((0, graphql_mapping_template_1.ref)('context.args.limit'), (0, graphql_mapping_template_1.ref)('context.args.limit'), (0, graphql_mapping_template_1.int)(graphql_transformer_common_1.ResourceConstants.DEFAULT_SEARCHABLE_PAGE_LIMIT), true),
                    search_after: (0, graphql_mapping_template_1.list)([(0, graphql_mapping_template_1.ref)('util.toJson($context.args.nextToken)')]),
                    from: (0, graphql_mapping_template_1.ref)('context.args.from'),
                    version: (0, graphql_mapping_template_1.bool)(includeVersion),
                    query: (0, graphql_mapping_template_1.ifElse)((0, graphql_mapping_template_1.ref)('context.args.filter'), (0, graphql_mapping_template_1.ref)('util.transform.toElasticsearchQueryDSL($ctx.args.filter)'), (0, graphql_mapping_template_1.obj)({
                        match_all: (0, graphql_mapping_template_1.obj)({}),
                    })),
                    sort: (0, graphql_mapping_template_1.list)([(0, graphql_mapping_template_1.raw)('{$sortField0: { "order" : $util.toJson($sortDirection) }}')]),
                }),
            ])),
            ResponseMappingTemplate: (0, graphql_mapping_template_1.print)((0, graphql_mapping_template_1.compoundExpression)([
                (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('es_items'), (0, graphql_mapping_template_1.list)([])),
                (0, graphql_mapping_template_1.forEach)((0, graphql_mapping_template_1.ref)('entry'), (0, graphql_mapping_template_1.ref)('context.result.hits.hits'), [
                    (0, graphql_mapping_template_1.iff)((0, graphql_mapping_template_1.raw)('!$foreach.hasNext'), (0, graphql_mapping_template_1.set)((0, graphql_mapping_template_1.ref)('nextToken'), (0, graphql_mapping_template_1.ref)('entry.sort.get(0)'))),
                    ...this.getSourceMapper(includeVersion),
                ]),
                (0, graphql_mapping_template_1.toJson)((0, graphql_mapping_template_1.obj)({
                    items: (0, graphql_mapping_template_1.ref)('es_items'),
                    total: (0, graphql_mapping_template_1.ref)('ctx.result.hits.total'),
                    nextToken: (0, graphql_mapping_template_1.ref)('nextToken'),
                })),
            ])),
        }).dependsOn([graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDataSourceLogicalID]);
    }
    makeDomainArnOutput() {
        return {
            Description: 'Elasticsearch instance Domain ARN.',
            Value: cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID, 'DomainArn'),
            Export: {
                Name: cloudform_types_1.Fn.Join(':', [cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.AppSyncApiId), 'GetAtt', 'Elasticsearch', 'DomainArn']),
            },
        };
    }
    makeDomainEndpointOutput() {
        return {
            Description: 'Elasticsearch instance Domain Endpoint.',
            Value: cloudform_types_1.Fn.Join('', ['https://', cloudform_types_1.Fn.GetAtt(graphql_transformer_common_1.ResourceConstants.RESOURCES.ElasticsearchDomainLogicalID, 'DomainEndpoint')]),
            Export: {
                Name: cloudform_types_1.Fn.Join(':', [cloudform_types_1.Fn.Ref(graphql_transformer_common_1.ResourceConstants.PARAMETERS.AppSyncApiId), 'GetAtt', 'Elasticsearch', 'DomainEndpoint']),
            },
        };
    }
}
exports.ResourceFactory = ResourceFactory;
//# sourceMappingURL=resources.js.map