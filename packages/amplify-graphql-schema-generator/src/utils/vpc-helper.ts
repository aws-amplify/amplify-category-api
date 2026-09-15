/* eslint-disable no-use-before-define */
import {
  IAMClient,
  CreateRoleCommand,
  GetRoleCommand,
  GetRoleCommandOutput,
  CreateRoleCommandOutput,
  Role,
  CreatePolicyCommand,
  Policy,
  CreatePolicyCommandOutput,
  AttachRolePolicyCommand,
  waitUntilPolicyExists,
  waitUntilRoleExists,
} from '@aws-sdk/client-iam';
import {
  LambdaClient,
  CreateFunctionCommand,
  CreateFunctionCommandInput,
  InvokeCommand,
  LogType,
  UpdateFunctionCodeCommand,
  UpdateFunctionCodeCommandInput,
  GetFunctionCommand,
  GetFunctionCommandOutput,
  waitUntilFunctionActive,
  FunctionConfiguration,
  DeleteFunctionCommand,
} from '@aws-sdk/client-lambda';
import * as fs from 'fs-extra';
import ora from 'ora';
import { VpcConfig } from '@aws-amplify/graphql-transformer-interfaces';
import { checkHostInDBClusters } from './vpc-helper-cluster';
import { checkHostInDBProxies } from './vpc-helper-proxy';
import { checkHostInDBInstances } from './vpc-helper-instance';

const spinner = ora('');

/**
 * Searches for the host in DB Proxies, then DB Clusters, and finally DB Instances. Returns the VPC configuration if found. Note that some
 * inspections may require additional API calls to derive subnet and availability zone configurations.
 * When region is not provided, we will use the region configured in the AWS profile.
 * @param hostname Hostname of the database.
 * @param region AWS region.
 * @returns the VpcConfig for the database or undefined if not found.
 */
export const getHostVpc = async (hostname: string, region?: string): Promise<VpcConfig | undefined> => {
  const proxyResult = await checkHostInDBProxies(hostname, region);
  if (proxyResult) {
    return proxyResult;
  }

  const warning = (clusterOrInstance: string): string => {
    return (
      `The host you provided is for an RDS ${clusterOrInstance}. Consider using an RDS Proxy as your data source instead.\n` +
      'See the documentation for a discussion of how an RDS proxy can help you scale your application more effectively.'
    );
  };

  const clusterResult = await checkHostInDBClusters(hostname, region);
  if (clusterResult) {
    console.warn(warning('cluster'));
    return clusterResult;
  }

  const instanceResult = await checkHostInDBInstances(hostname, region);
  if (instanceResult) {
    console.warn(warning('instance'));
    return instanceResult;
  }

  return undefined;
};

/**
 * Provisions a lambda function to introspect the database schema.
 * @param lambdaName Name of the lambda function.
 * @param vpc VPC configuration.
 * @param region AWS region.
 */
export const provisionSchemaInspectorLambda = async (lambdaName: string, vpc: VpcConfig, region: string): Promise<void> => {
  const roleName = `${lambdaName}-execution-role`;
  let createLambda = true;
  const iamRole = await createRoleIfNotExists(roleName, region);
  const existingLambda = await getSchemaInspectorLambda(lambdaName, region);
  spinner.start('Provisioning a function to introspect the database schema...');
  try {
    if (existingLambda) {
      const subnetIds = vpc.subnetAvailabilityZoneConfig.map((sn) => sn.subnetId);
      const vpcConfigMismatch =
        existingLambda.VpcConfig?.SecurityGroupIds?.sort().join() !== vpc.securityGroupIds.sort().join() ||
        existingLambda.VpcConfig?.SubnetIds?.sort().join() !== subnetIds.sort().join();
      if (vpcConfigMismatch) {
        await deleteSchemaInspectorLambdaRole(lambdaName, region);
        createLambda = true;
      } else {
        await updateSchemaInspectorLambda(lambdaName, region);
        createLambda = false;
      }
    }
    if (createLambda) {
      await createSchemaInspectorLambda(lambdaName, iamRole, vpc, region);
    }
  } catch (err) {
    spinner.fail('Failed to provision a function to introspect the database schema.');
    console.debug(`Error provisioning a function to introspect the database schema: ${err}`);
    throw err;
  }
  spinner.succeed('Successfully provisioned a function to introspect the database schema.');
};

const getSchemaInspectorLambda = async (lambdaName: string, region: string): Promise<FunctionConfiguration | undefined> => {
  const lambdaClient = new LambdaClient({ region });
  const params = {
    FunctionName: lambdaName,
  };

  try {
    const response: GetFunctionCommandOutput = await lambdaClient.send(new GetFunctionCommand(params));
    return response.Configuration;
  } catch (err) {
    return undefined;
  }
};

const deleteSchemaInspectorLambdaRole = async (lambdaName: string, region: string): Promise<void> => {
  const lambdaClient = new LambdaClient({ region });
  const params = {
    FunctionName: lambdaName,
  };
  const FUNCTION_DELETE_DELAY = 10000;

  await lambdaClient.send(new DeleteFunctionCommand(params));
  // Wait for the lambda to be deleted. This is required when the lambda is deleted and recreated with the same name when there is a VPC
  // change.
  await sleep(FUNCTION_DELETE_DELAY);
};

const createSchemaInspectorLambda = async (lambdaName: string, iamRole: Role, vpc: VpcConfig, region: string): Promise<void> => {
  const lambdaClient = new LambdaClient({ region });
  const subnetIds = vpc.subnetAvailabilityZoneConfig.map((sn) => sn.subnetId);

  const params: CreateFunctionCommandInput = {
    Code: {
      ZipFile: await fs.readFile(`${__dirname}/../rds-schema-inspector.zip`),
    },
    PackageType: 'Zip',
    FunctionName: lambdaName,
    Handler: 'index.handler',
    Role: iamRole.Arn,
    Runtime: 'nodejs24.x',
    VpcConfig: {
      SecurityGroupIds: vpc.securityGroupIds,
      SubnetIds: subnetIds,
    },
    Timeout: 30,
  };

  const response = await lambdaClient.send(new CreateFunctionCommand(params));
  await waitUntilFunctionActive({ client: lambdaClient, maxWaitTime: 600 }, { FunctionName: response.FunctionName! });
};

const updateSchemaInspectorLambda = async (lambdaName: string, region: string): Promise<void> => {
  const lambdaClient = new LambdaClient({ region });

  const params: UpdateFunctionCodeCommandInput = {
    FunctionName: lambdaName,
    ZipFile: await fs.readFile(`${__dirname}/../rds-schema-inspector.zip`),
  };

  await lambdaClient.send(new UpdateFunctionCodeCommand(params));
};

const createRoleIfNotExists = async (roleName: string, region: string): Promise<Role> => {
  let role = await getRole(roleName, region);
  // Wait for role created with SDK to propagate.
  // Otherwise it will throw error "The role defined for the function cannot be assumed by Lambda" while creating the lambda.
  const ROLE_PROPAGATION_DELAY = 10000;
  if (!role) {
    role = await createRole(roleName, region);
    await sleep(ROLE_PROPAGATION_DELAY);
  }
  return role;
};

/**
 * Sleeps for the specified time.
 * @param milliseconds Time in milliseconds.
 */
export const sleep = async (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

const createPolicy = async (policyName: string, region: string): Promise<Policy | undefined> => {
  const client = new IAMClient({ region });
  const command = new CreatePolicyCommand({
    PolicyName: policyName,
    PolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Resource: '*',
          Action: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
        },
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource: ['arn:aws:logs:*:*:*'],
        },
      ],
    }),
  });
  const result: CreatePolicyCommandOutput = await client.send(command);
  await waitUntilPolicyExists({ client, maxWaitTime: 30 }, { PolicyArn: result.Policy.Arn });
  return result.Policy;
};

const createRole = async (roleName: string, region: string): Promise<Role | undefined> => {
  const client = new IAMClient({ region });
  const policy = await createPolicy(`${roleName}-policy`, region);
  const command = new CreateRoleCommand({
    AssumeRolePolicyDocument: JSON.stringify({
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
    }),
    RoleName: roleName,
  });

  const result: CreateRoleCommandOutput = await client.send(command);

  const attachPolicyCommand = new AttachRolePolicyCommand({
    PolicyArn: policy.Arn,
    RoleName: roleName,
  });
  await client.send(attachPolicyCommand);
  await waitUntilRoleExists({ client, maxWaitTime: 30 }, { RoleName: roleName });
  return result.Role;
};

const getRole = async (roleName: string, region: string): Promise<Role | undefined> => {
  const client = new IAMClient({ region });
  const command = new GetRoleCommand({
    RoleName: roleName,
  });

  try {
    const response: GetRoleCommandOutput = await client.send(command);
    return response.Role;
  } catch (err) {
    if (err.name == 'NoSuchEntityException') {
      return undefined;
    }
    throw err;
  }
};

/**
 * Invokes the schema inspector lambda function.
 * @param funcName Name of the lambda function.
 * @param dbConfig Database configuration.
 * @param query Query to be executed.
 * @param region AWS region.
 */
export const invokeSchemaInspectorLambda = async (funcName, dbConfig, query, region) => {
  const client = new LambdaClient({ region });
  const encoder = new TextEncoder();
  const command = new InvokeCommand({
    FunctionName: funcName,
    Payload: encoder.encode(
      JSON.stringify({
        config: dbConfig,
        query,
      }),
    ),
    LogType: LogType.Tail,
  });

  const { Payload } = await client.send(command);
  const result = Buffer.from(Payload).toString();
  const resultJson = JSON.parse(result);
  if (resultJson.errorMessage) {
    throw new Error(`Error occurred while fetching the database metadata: ${resultJson.errorMessage}`);
  }
  return resultJson;
};
