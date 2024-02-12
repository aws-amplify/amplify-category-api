import path from 'path';
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
import { SQLLambdaResourceNames, setResourceName } from '@aws-amplify/graphql-transformer-core';
import {
  GraphQLAPIProvider,
  RDSLayerMapping,
  SubnetAvailabilityZone,
  TransformerContextProvider,
  VpcConfig,
  ProvisionedConcurrencyConfig,
  SqlModelDataSourceDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionConfig,
  isSqlModelDataSourceSecretsManagerDbConnectionConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction, LayerVersion, Runtime, Alias, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnumTypeDefinitionNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { CfnVPCEndpoint } from 'aws-cdk-lib/aws-ec2';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

/**
 * Define RDS Lambda operations
 */
export type OPERATIONS = 'CREATE' | 'UPDATE' | 'DELETE' | 'GET' | 'LIST' | 'SYNC';

/**
 * Available credentials storage methods for the SQL lambda.
 * This must match enum in rds-lambda/handler.ts
 */
export enum CredentialStorageMethod {
  SSM = 'SSM',
  SECRETS_MANAGER = 'SECRETS_MANAGER',
}

const OPERATION_KEY = '__operation';

/**
 * Define RDS Lambda Layer region mappings. The optional `mapping` can be specified in place of the defaults that are hardcoded at the time
 * this package is published. For the CLI flow, the `mapping` will be downloaded at runtime during the `amplify push` flow. For the CDK,
 * the layer version will be resolved by a custom CDK resource.
 * @param scope Construct
 * @param mapping an RDSLayerMapping to use in place of the defaults
 */
export const setRDSLayerMappings = (scope: Construct, mapping: RDSLayerMapping, resourceNames: SQLLambdaResourceNames): CfnMapping =>
  new CfnMapping(scope, resourceNames.sqlLayerVersionMapping, {
    mapping,
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
  layerVersionArn: string,
  resourceNames: SQLLambdaResourceNames,
  credentialStorageMethod: CredentialStorageMethod | undefined,
  environment?: { [key: string]: string },
  sqlLambdaVpcConfig?: VpcConfig,
  sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig,
): IFunction => {
  const lambdaEnvironment = {
    ...environment,
  };

  if (credentialStorageMethod === CredentialStorageMethod.SSM) {
    let ssmEndpoint = Fn.join('', ['ssm.', Fn.ref('AWS::Region'), '.amazonaws.com']); // Default SSM endpoint
    if (sqlLambdaVpcConfig) {
      const services = ['ssm', 'ssmmessages', 'ec2', 'ec2messages', 'kms'];
      const endpoints = addVpcEndpoints(scope, sqlLambdaVpcConfig, resourceNames, services);
      const endpointEntries = endpoints.find((endpoint) => endpoint.service === 'ssm')?.endpoint.attrDnsEntries;
      if (endpointEntries) {
        ssmEndpoint = Fn.select(0, endpointEntries);
      }
    }

    lambdaEnvironment.SSM_ENDPOINT = ssmEndpoint;
    lambdaEnvironment.CREDENTIAL_STORAGE_METHOD = CredentialStorageMethod.SSM;
  } else if (credentialStorageMethod === CredentialStorageMethod.SECRETS_MANAGER) {
    let secretsManagerEndpoint = Fn.join('', ['secretsmanager.', Fn.ref('AWS::Region'), '.amazonaws.com']); // Default SSM endpoint
    if (sqlLambdaVpcConfig) {
      const services = ['secretsmanager'];
      const endpoints = addVpcEndpoints(scope, sqlLambdaVpcConfig, resourceNames, services);
      const endpointEntries = endpoints.find((endpoint) => endpoint.service === 'secretsmanager')?.endpoint.attrDnsEntries;
      if (endpointEntries) {
        secretsManagerEndpoint = Fn.select(0, endpointEntries);
      }
    }

    lambdaEnvironment.SECRETS_MANAGER_ENDPOINT = secretsManagerEndpoint;
    lambdaEnvironment.CREDENTIAL_STORAGE_METHOD = CredentialStorageMethod.SECRETS_MANAGER;
  } else {
    throw new Error('Unable to determine if SSM or Secrets Manager should be used for credentials.');
  }

  const fn = apiGraphql.host.addLambdaFunction(
    resourceNames.sqlLambdaFunction,
    `functions/${resourceNames.sqlLambdaFunction}.zip`,
    'handler.run',
    path.resolve(__dirname, '..', '..', '..', 'lib', 'rds-lambda.zip'),
    Runtime.NODEJS_18_X,
    [LayerVersion.fromLayerVersionArn(scope, resourceNames.sqlLambdaLayerVersion, layerVersionArn)],
    lambdaRole,
    lambdaEnvironment,
    Duration.seconds(30),
    scope,
    sqlLambdaVpcConfig,
  );

  if (sqlLambdaProvisionedConcurrencyConfig) {
    const { provisionedConcurrentExecutions } = sqlLambdaProvisionedConcurrencyConfig;

    const alias = new Alias(scope, resourceNames.sqlLambdaAliasLogicalId, {
      // The alias name will be appended to the function ARN to create a new ARN for execution. Note that the total length of the ARN may
      // not exceed 140 characters, so make sure the alias name is fairly short.
      aliasName: resourceNames.sqlLambdaAliasName,
      version: (fn as LambdaFunction).currentVersion,
      provisionedConcurrentExecutions,
    });
    setResourceName(alias, { name: resourceNames.sqlLambdaAliasLogicalId, setOnDefaultChild: true });
    return alias;
  }

  return fn;
};

/**
 * Generates an AwsCustomResource to resolve the Amplify SQL Lambda Layer version for the SQL Lambda function installed into the customer
 * account. AwsCustomResources use a singleton Lambda, but those are still scoped per stack. Since we create a separate stack for each
 * strategy, it makes sense to create the custom resource provider (which after all is just a set of Lambda functions and layers) inside the
 * strategy stack.
 *
 * Note that AwsCustomResources are not backed by specific Cfn resources, and so would not appear in the API's `resources` property if we
 * add the name. We can figure out the right way to expose this to customers if needed, but for now we are not invoking `setResourceName`
 * because it would have no effect.
 */
export const createLayerVersionCustomResource = (scope: Construct, resourceNames: SQLLambdaResourceNames): AwsCustomResource => {
  const { SQLLayerVersionManifestBucket, SQLLayerVersionManifestBucketRegion, SQLLayerVersionManifestKeyPrefix } =
    ResourceConstants.RESOURCES;

  const key = Fn.join('', [SQLLayerVersionManifestKeyPrefix, Fn.ref('AWS::Region')]);

  const manifestArn = `arn:aws:s3:::${SQLLayerVersionManifestBucket}/${key}`;

  const resourceName = resourceNames.sqlLayerVersionResolverCustomResource;
  const customResource = new AwsCustomResource(scope, resourceName, {
    resourceType: 'Custom::SQLLayerVersionCustomResource',
    onUpdate: {
      service: 'S3',
      action: 'getObject',
      region: SQLLayerVersionManifestBucketRegion,
      parameters: {
        Bucket: SQLLayerVersionManifestBucket,
        Key: key,
      },
      // Make the physical ID change each time we do a deployment, so we always check for the latest version. This means we will never have
      // a strictly no-op deployment, but the SQL Lambda configuration won't change unless the actual layer value changes
      physicalResourceId: PhysicalResourceId.of(`${resourceName}-${Date.now().toString()}`),
    },
    policy: AwsCustomResourcePolicy.fromSdkCalls({
      resources: [manifestArn],
    }),
  });

  return customResource;
};

const addVpcEndpoint = (
  scope: Construct,
  sqlLambdaVpcConfig: VpcConfig,
  serviceSuffix: string,
  resourceNames: SQLLambdaResourceNames,
): CfnVPCEndpoint => {
  const serviceEndpointPrefix = 'com.amazonaws';
  const endpoint = new CfnVPCEndpoint(scope, `${resourceNames.sqlVpcEndpointPrefix}${serviceSuffix}`, {
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

const addVpcEndpoints = (
  scope: Construct,
  sqlLambdaVpcConfig: VpcConfig,
  resourceNames: SQLLambdaResourceNames,
  services: string[],
): { service: string; endpoint: CfnVPCEndpoint }[] => {
  return services.map((service) => {
    return {
      service,
      endpoint: addVpcEndpoint(scope, sqlLambdaVpcConfig, service, resourceNames),
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
  resourceNames: SQLLambdaResourceNames,
  environment?: { [key: string]: string },
  sqlLambdaVpcConfig?: VpcConfig,
): IFunction => {
  return apiGraphql.host.addLambdaFunction(
    resourceNames.sqlPatchingLambdaFunction,
    `functions/${resourceNames.sqlPatchingLambdaFunction}.zip`,
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
export const createRdsLambdaRole = (
  roleName: string,
  scope: Construct,
  secretEntry: SqlModelDataSourceDbConnectionConfig,
  resourceNames: SQLLambdaResourceNames,
): IRole => {
  const role = new Role(scope, resourceNames.sqlLambdaExecutionRole, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  setResourceName(role, { name: resourceNames.sqlLambdaExecutionRole, setOnDefaultChild: true });
  const policyStatements = [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:*'],
    }),
  ];
  if (secretEntry) {
    if (isSqlModelDataSourceSsmDbConnectionConfig(secretEntry)) {
      policyStatements.push(
        new PolicyStatement({
          actions: ['ssm:GetParameter', 'ssm:GetParameters'],
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:ssm:*:*:parameter${secretEntry.usernameSsmPath}`,
            `arn:aws:ssm:*:*:parameter${secretEntry.passwordSsmPath}`,
            `arn:aws:ssm:*:*:parameter${secretEntry.hostnameSsmPath}`,
            `arn:aws:ssm:*:*:parameter${secretEntry.databaseNameSsmPath}`,
            `arn:aws:ssm:*:*:parameter${secretEntry.portSsmPath}`,
          ],
        }),
      );
    } else if (isSqlModelDataSourceSecretsManagerDbConnectionConfig(secretEntry)) {
      policyStatements.push(
        new PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          effect: Effect.ALLOW,
          resources: [secretEntry.secretArn],
        }),
      );
      if (secretEntry.keyArn) {
        policyStatements.push(
          new PolicyStatement({
            actions: ['kms:Decrypt'],
            effect: Effect.ALLOW,
            resources: [secretEntry.keyArn],
          }),
        );
      }
    } else {
      throw new Error('Unable to determine if SSM or Secrets Manager should be used for credentials.');
    }
  }

  role.attachInlinePolicy(
    new Policy(scope, resourceNames.sqlLambdaExecutionRolePolicy, {
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
export const createRdsPatchingLambdaRole = (
  roleName: string,
  scope: Construct,
  functionArn: string,
  resourceNames: SQLLambdaResourceNames,
): IRole => {
  const role = new Role(scope, resourceNames.sqlPatchingLambdaExecutionRole, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  setResourceName(role, { name: resourceNames.sqlPatchingLambdaExecutionRole, setOnDefaultChild: true });
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
    new Policy(scope, resourceNames.sqlPatchingLambdaExecutionRolePolicy, {
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
