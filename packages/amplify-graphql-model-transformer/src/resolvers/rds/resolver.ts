import { CfnMapping, Duration, Fn } from 'aws-cdk-lib';
import {
  Expression,
  compoundExpression,
  ifElse,
  iff,
  list,
  methodCall,
  not,
  obj,
  printBlock,
  qref,
  ref,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import { ResourceConstants, isArrayOrObject, isListType } from 'graphql-transformer-common';
import { RDSConnectionSecrets, setResourceName } from '@aws-amplify/graphql-transformer-core';
import {
  GraphQLAPIProvider,
  RDSLayerMapping,
  SubnetAvailabilityZone,
  TransformerContextProvider,
  VpcConfig,
  ProvisionedConcurrencyConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction, LayerVersion, Runtime, Alias, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { ScalableTarget, ServiceNamespace, PredefinedMetric } from 'aws-cdk-lib/aws-applicationautoscaling';
import { Construct } from 'constructs';
import path from 'path';
import { EnumTypeDefinitionNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { CfnVPCEndpoint } from 'aws-cdk-lib/aws-ec2';

/**
 * Define RDS Lambda operations
 */
export type OPERATIONS = 'CREATE' | 'UPDATE' | 'DELETE' | 'GET' | 'LIST' | 'SYNC';

const OPERATION_KEY = '__operation';

const RDSLayerMappingID = 'RDSLayerResourceMapping';
// TODO: This is temporary state, we need to modify this to a production layer
/**
 * Define RDS Lambda Layer region mappings
 * @param scope Construct
 */
export const setRDSLayerMappings = (scope: Construct, mapping?: RDSLayerMapping): CfnMapping =>
  new CfnMapping(scope, RDSLayerMappingID, {
    mapping: getLatestLayers(mapping),
  });

const getLatestLayers = (latestLayers?: RDSLayerMapping): RDSLayerMapping => {
  if (latestLayers && Object.keys(latestLayers).length > 0) {
    return latestLayers;
  }
  console.warn('Unable to load the latest RDS layer configuration, using local configuration.');
  const defaultLayerMapping = getDefaultLayerMapping();
  return defaultLayerMapping;
};

// For beta use account '956468067974', layer name 'AmplifyRDSLayerBeta' and layer version '12' as of 2023-06-20
// For prod use account '582037449441', layer name 'AmplifyRDSLayer' and layer version '3' as of 2023-06-20
const getDefaultLayerMapping = (): RDSLayerMapping => ({
  'ap-northeast-1': {
    layerRegion: 'arn:aws:lambda:ap-northeast-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'us-east-1': {
    layerRegion: 'arn:aws:lambda:us-east-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ap-southeast-1': {
    layerRegion: 'arn:aws:lambda:ap-southeast-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'eu-west-1': {
    layerRegion: 'arn:aws:lambda:eu-west-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'us-west-1': {
    layerRegion: 'arn:aws:lambda:us-west-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ap-east-1': {
    layerRegion: 'arn:aws:lambda:ap-east-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ap-northeast-2': {
    layerRegion: 'arn:aws:lambda:ap-northeast-2:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ap-northeast-3': {
    layerRegion: 'arn:aws:lambda:ap-northeast-3:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ap-south-1': {
    layerRegion: 'arn:aws:lambda:ap-south-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ap-southeast-2': {
    layerRegion: 'arn:aws:lambda:ap-southeast-2:582037449441:layer:AmplifyRDSLayer:22',
  },
  'ca-central-1': {
    layerRegion: 'arn:aws:lambda:ca-central-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'eu-central-1': {
    layerRegion: 'arn:aws:lambda:eu-central-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'eu-north-1': {
    layerRegion: 'arn:aws:lambda:eu-north-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'eu-west-2': {
    layerRegion: 'arn:aws:lambda:eu-west-2:582037449441:layer:AmplifyRDSLayer:22',
  },
  'eu-west-3': {
    layerRegion: 'arn:aws:lambda:eu-west-3:582037449441:layer:AmplifyRDSLayer:22',
  },
  'sa-east-1': {
    layerRegion: 'arn:aws:lambda:sa-east-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'us-east-2': {
    layerRegion: 'arn:aws:lambda:us-east-2:582037449441:layer:AmplifyRDSLayer:22',
  },
  'us-west-2': {
    layerRegion: 'arn:aws:lambda:us-west-2:582037449441:layer:AmplifyRDSLayer:22',
  },
  'cn-north-1': {
    layerRegion: 'arn:aws:lambda:cn-north-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'cn-northwest-1': {
    layerRegion: 'arn:aws:lambda:cn-northwest-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'us-gov-west-1': {
    layerRegion: 'arn:aws:lambda:us-gov-west-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'us-gov-east-1': {
    layerRegion: 'arn:aws:lambda:us-gov-east-1:582037449441:layer:AmplifyRDSLayer:22',
  },
  'me-south-1': {
    layerRegion: 'arn:aws:lambda:me-south-1:582037449441:layer:AmplifyRDSLayer:22',
  },
});

/**
 * Create RDS Lambda function
 * @param scope Construct
 * @param apiGraphql GraphQLAPIProvider
 * @param lambdaRole IRole
 */
export const createRdsLambda = (
  scope: Construct,
  apiGraphql: GraphQLAPIProvider,
  lambdaRole: IRole,
  environment?: { [key: string]: string },
  sqlLambdaVpcConfig?: VpcConfig,
  sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig,
): IFunction => {
  const { RDSLambdaLogicalID, RDSLambdaAliasLogicalID, RDSLambdaScalableTargetLogicalID } = ResourceConstants.RESOURCES;

  let ssmEndpoint = Fn.join('', ['ssm.', Fn.ref('AWS::Region'), '.amazonaws.com']); // Default SSM endpoint
  if (sqlLambdaVpcConfig) {
    const endpoints = addVpcEndpointForSecretsManager(scope, sqlLambdaVpcConfig);
    const ssmEndpointEntries = endpoints.find((endpoint) => endpoint.service === 'ssm')?.endpoint.attrDnsEntries;
    if (ssmEndpointEntries) {
      ssmEndpoint = Fn.select(0, ssmEndpointEntries);
    }
  }

  const fn = apiGraphql.host.addLambdaFunction(
    RDSLambdaLogicalID,
    `functions/${RDSLambdaLogicalID}.zip`,
    'handler.run',
    path.resolve(__dirname, '..', '..', '..', 'lib', 'rds-lambda.zip'),
    Runtime.NODEJS_18_X,
    [
      LayerVersion.fromLayerVersionArn(
        scope,
        'SQLLambdaLayerVersion',
        Fn.findInMap(RDSLayerMappingID, Fn.ref('AWS::Region'), 'layerRegion'),
      ),
    ],
    lambdaRole,
    {
      ...environment,
      SSM_ENDPOINT: ssmEndpoint,
    },
    Duration.seconds(30),
    scope,
    sqlLambdaVpcConfig,
  );

  if (sqlLambdaProvisionedConcurrencyConfig) {
    const { provisionedConcurrentExecutions } = sqlLambdaProvisionedConcurrencyConfig;

    const alias = new Alias(scope, RDSLambdaAliasLogicalID, {
      aliasName: `${RDSLambdaLogicalID}Alias`,
      version: (fn as LambdaFunction).currentVersion,
      provisionedConcurrentExecutions,
    });
  }

  return fn;
};

const addVpcEndpoint = (scope: Construct, sqlLambdaVpcConfig: VpcConfig, serviceSuffix: string): CfnVPCEndpoint => {
  const serviceEndpointPrefix = 'com.amazonaws';
  const endpoint = new CfnVPCEndpoint(scope, `RDSVpcEndpoint${serviceSuffix}`, {
    serviceName: Fn.join('', [serviceEndpointPrefix, '.', Fn.ref('AWS::Region'), '.', serviceSuffix]), // Sample: com.amazonaws.us-east-1.ssmmessages
    vpcEndpointType: 'Interface',
    vpcId: sqlLambdaVpcConfig.vpcId,
    subnetIds: extractSubnetForVpcEndpoint(sqlLambdaVpcConfig.subnetAvailabilityZoneConfig),
    securityGroupIds: sqlLambdaVpcConfig.securityGroupIds,
    privateDnsEnabled: false,
  });
  setResourceName(endpoint, { name: endpoint.logicalId, setOnDefaultChild: true });

  return endpoint;
};

const addVpcEndpointForSecretsManager = (
  scope: Construct,
  sqlLambdaVpcConfig: VpcConfig,
): { service: string; endpoint: CfnVPCEndpoint }[] => {
  const services = ['ssm', 'ssmmessages', 'ec2', 'ec2messages', 'kms'];
  return services.map((service) => {
    return {
      service,
      endpoint: addVpcEndpoint(scope, sqlLambdaVpcConfig, service),
    };
  });
};

/**
 * Extract subnet ids for VPC endpoint - We only need one subnet per AZ.
 * This is mandatory requirement for creating VPC endpoint.
 * CDK Deployment will fail if you provide more than one subnet per AZ.
 * @param avaliabilityZoneMappings SubnetAvailabilityZone[]
 * @returns string[]
 */
const extractSubnetForVpcEndpoint = (avaliabilityZoneMappings: SubnetAvailabilityZone[]): string[] => {
  const avaliabilityZones = [] as string[];
  const result = [];
  for (const subnet of avaliabilityZoneMappings) {
    if (!avaliabilityZones.includes(subnet.availabilityZone)) {
      avaliabilityZones.push(subnet.availabilityZone);
      result.push(subnet.subnetId);
    }
  }
  return result;
};

/**
 * Create RDS Patching Lambda function
 * @param scope Construct
 * @param apiGraphql GraphQLAPIProvider
 * @param lambdaRole IRole
 */
export const createRdsPatchingLambda = (
  scope: Construct,
  apiGraphql: GraphQLAPIProvider,
  lambdaRole: IRole,
  environment?: { [key: string]: string },
  sqlLambdaVpcConfig?: VpcConfig,
): IFunction => {
  const { RDSPatchingLambdaLogicalID } = ResourceConstants.RESOURCES;
  return apiGraphql.host.addLambdaFunction(
    RDSPatchingLambdaLogicalID,
    `functions/${RDSPatchingLambdaLogicalID}.zip`,
    'index.handler',
    path.resolve(__dirname, '..', '..', '..', 'lib', 'rds-patching-lambda.zip'),
    Runtime.NODEJS_18_X,
    [],
    lambdaRole,
    environment,
    Duration.minutes(6), // We have an arbituary wait time of up to 5 minutes in the lambda function to avoid throttling errors
    scope,
    sqlLambdaVpcConfig,
  );
};

/**
 * Create RDS Lambda IAM role
 * @param roleName string
 * @param scope Construct
 * @param secretEntry RDSConnectionSecrets
 */
export const createRdsLambdaRole = (roleName: string, scope: Construct, secretEntry: RDSConnectionSecrets): IRole => {
  const { RDSLambdaIAMRoleLogicalID, RDSLambdaLogAccessPolicy } = ResourceConstants.RESOURCES;
  const role = new Role(scope, RDSLambdaIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  setResourceName(role, { name: RDSLambdaIAMRoleLogicalID, setOnDefaultChild: true });
  const policyStatements = [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:*'],
    }),
  ];
  if (secretEntry) {
    policyStatements.push(
      new PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        effect: Effect.ALLOW,
        resources: [
          `arn:aws:ssm:*:*:parameter${secretEntry.username}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.password}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.host}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.database}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.port}`,
        ],
      }),
    );
  }

  role.attachInlinePolicy(
    new Policy(scope, RDSLambdaLogAccessPolicy, {
      statements: policyStatements,
      policyName: `${roleName}Policy`,
    }),
  );

  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
    }),
  );

  return role;
};

/**
 * Create RDS Patching Lambda IAM role
 * @param roleName string
 * @param scope Construct
 * @param functionArn FunctionArn
 */
export const createRdsPatchingLambdaRole = (roleName: string, scope: Construct, functionArn: string): IRole => {
  const { RDSPatchingLambdaIAMRoleLogicalID, RDSPatchingLambdaLogAccessPolicy } = ResourceConstants.RESOURCES;
  const role = new Role(scope, RDSPatchingLambdaIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  setResourceName(role, { name: RDSPatchingLambdaIAMRoleLogicalID, setOnDefaultChild: true });
  const policyStatements = [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:*'],
    }),
    new PolicyStatement({
      actions: ['lambda:UpdateFunctionConfiguration'],
      effect: Effect.ALLOW,
      resources: [functionArn],
    }),
    new PolicyStatement({
      actions: ['lambda:GetLayerVersion', 'lambda:GetLayerVersionPolicy'],
      effect: Effect.ALLOW,
      resources: ['*'],
    }),
  ];

  role.attachInlinePolicy(
    new Policy(scope, RDSPatchingLambdaLogAccessPolicy, {
      statements: policyStatements,
      policyName: `${roleName}Policy`,
    }),
  );

  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
    }),
  );

  return role;
};

/**
 * Generate RDS Lambda request template
 * @param tableName string
 * @param operation string
 * @param operationName string
 */
export const generateLambdaRequestTemplate = (
  tableName: string,
  operation: string,
  operationName: string,
  ctx: TransformerContextProvider,
): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.operation'), str(operation)),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructAuthFilterStatement('lambdaInput.args.metadata.authFilter'),
      constructNonScalarFieldsStatement(tableName, ctx),
      constructArrayFieldsStatement(tableName, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
      qref(methodCall(ref('lambdaInput.args.input.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};

/**
 * Generate RDS Lambda response template
 * @param isSyncEnabled boolean
 */
export const generateGetLambdaResponseTemplate = (isSyncEnabled: boolean): string => {
  const statements: Expression[] = [];
  if (isSyncEnabled) {
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'), ref('ctx.result')),
        toJson(ref('ctx.result')),
      ),
    );
  } else {
    statements.push(
      ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
    );
  }

  return printBlock('ResponseTemplate')(compoundExpression(statements));
};

/**
 * Generate common response template used by most of the resolvers.
 * Append operation if response is coming from a mutation, this is to protect field resolver for subscriptions
 * @param isSyncEnabled boolean
 * @param mutation boolean
 */
export const generateDefaultLambdaResponseMappingTemplate = (isSyncEnabled: boolean, mutation = false): string => {
  const statements: Expression[] = [];
  if (mutation) statements.push(qref(methodCall(ref('ctx.result.put'), str(OPERATION_KEY), str('Mutation'))));
  if (isSyncEnabled) {
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'), ref('ctx.result')),
        toJson(ref('ctx.result')),
      ),
    );
  } else {
    statements.push(
      ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
    );
  }

  return printBlock('ResponseTemplate')(compoundExpression(statements));
};

export const getNonScalarFields = (object: ObjectTypeDefinitionNode | undefined, ctx: TransformerContextProvider): string[] => {
  if (!object) {
    return [];
  }
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
  return object.fields?.filter((f: FieldDefinitionNode) => isArrayOrObject(f.type, enums)).map((f) => f.name.value) || [];
};

export const getArrayFields = (object: ObjectTypeDefinitionNode | undefined, ctx: TransformerContextProvider): string[] => {
  if (!object) {
    return [];
  }
  return object.fields?.filter((f: FieldDefinitionNode) => isListType(f.type)).map((f) => f.name.value) || [];
};

export const constructNonScalarFieldsStatement = (tableName: string, ctx: TransformerContextProvider): Expression =>
  set(ref('lambdaInput.args.metadata.nonScalarFields'), list(getNonScalarFields(ctx.output.getObject(tableName), ctx).map(str)));

export const constructArrayFieldsStatement = (tableName: string, ctx: TransformerContextProvider): Expression =>
  set(ref('lambdaInput.args.metadata.arrayFields'), list(getArrayFields(ctx.output.getObject(tableName), ctx).map(str)));

export const constructFieldMappingInput = (): Expression => {
  return compoundExpression([
    set(ref('lambdaInput.args.metadata.fieldMap'), obj({})),
    qref(
      methodCall(
        ref('lambdaInput.args.metadata.fieldMap.putAll'),
        methodCall(ref('util.defaultIfNull'), ref('context.stash.fieldMap'), obj({})),
      ),
    ),
  ]);
};

export const constructAuthFilterStatement = (keyName: string): Expression =>
  iff(not(methodCall(ref('util.isNullOrEmpty'), ref('ctx.stash.authFilter'))), set(ref(keyName), ref('ctx.stash.authFilter')));
