import * as path from 'path';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import {
  $TSContext,
  AmplifyCategories,
  CloudformationProviderFacade,
  JSONUtilities,
  pathManager,
  readCFNTemplate,
  stateManager,
} from '@aws-amplify/amplify-cli-core';
import { CloudFormation, Fn } from 'cloudform-types';
import { ResourceConstants } from 'graphql-transformer-common';
import { pullAllBy, find } from 'lodash';
import { printer } from '@aws-amplify/amplify-prompts';
import { DeploymentResources } from './cdk-compat/deployment-resources';
import { TransformerProjectConfig } from './cdk-compat/project-config';

const PARAMETERS_FILE_NAME = 'parameters.json';
const CUSTOM_ROLES_FILE_NAME = 'custom-roles.json';
const AMPLIFY_ADMIN_ROLE = '_Full-access/CognitoIdentityCredentials';
const AMPLIFY_MANAGE_ROLE = '_Manage-only/CognitoIdentityCredentials';
const PROVIDER_NAME = 'awscloudformation';
const FUNCTION_CFN_TEMPLATE_SUFFIX = '-cloudformation-template.json';
const LAMBDA_EXECUTION_ROLE_LOGICAL_ID = 'LambdaExecutionRole';
const NO_ENV_RESOURCES_ENV_NAME = 'NONE';
const SHOULD_NOT_CREATE_ENV_RESOURCES_CONDITION = 'ShouldNotCreateEnvResources';
const ENV_PLACEHOLDER_PATTERN = /\$\{env\}/g;
const STS_ASSUMED_ROLE_ARN_PATTERN = /^arn:[^:]*:sts::[^:]*:assumed-role\/(.+)$/;

interface CustomRolesConfig {
  adminRoleNames?: Array<string> | string;
}

export const getIdentityPoolId = async (ctx: $TSContext): Promise<string | undefined> => {
  const { allResources, resourcesToBeDeleted } = await ctx.amplify.getResourceStatus('auth');
  const authResources = pullAllBy(allResources, resourcesToBeDeleted, 'resourceName');
  const authResource = find(authResources, { service: 'Cognito', providerPlugin: PROVIDER_NAME }) as any;
  return authResource?.output?.IdentityPoolId;
};

/**
 * Resolves the subset of CloudFormation intrinsics used by the function template's role name into a literal string, returning
 * `undefined` for any shape that cannot be resolved without deploying.
 */
const resolveStaticCfnValue = (value: unknown, currentEnv: string): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const intrinsic = value as Record<string, unknown>;
  if (Array.isArray(intrinsic['Fn::If'])) {
    const [conditionName, whenTrue, whenFalse] = intrinsic['Fn::If'];
    // `ShouldNotCreateEnvResources` is the only condition whose meaning is known here, `env === 'NONE'`; any other condition
    // cannot be evaluated without deploying
    if (conditionName !== SHOULD_NOT_CREATE_ENV_RESOURCES_CONDITION) {
      return undefined;
    }
    return resolveStaticCfnValue(currentEnv === NO_ENV_RESOURCES_ENV_NAME ? whenTrue : whenFalse, currentEnv);
  }
  if (Array.isArray(intrinsic['Fn::Join'])) {
    const [delimiter, parts] = intrinsic['Fn::Join'];
    if (typeof delimiter !== 'string' || !Array.isArray(parts)) {
      return undefined;
    }
    const resolvedParts = parts.map((part) => resolveStaticCfnValue(part, currentEnv));
    return resolvedParts.some((part) => part === undefined) ? undefined : resolvedParts.join(delimiter);
  }
  if (intrinsic.Ref === 'env') {
    return currentEnv;
  }
  return undefined;
};

/**
 * Resolves the name of a function's Lambda execution role, preferring the deployed stack output and falling back to the role name
 * declared in the local CloudFormation template so that a not-yet-deployed function resolves too.
 */
const getFunctionExecutionRoleName = (functionResource: any, currentEnv: string): string | undefined => {
  const deployedRoleName = functionResource?.output?.[LAMBDA_EXECUTION_ROLE_LOGICAL_ID];
  if (typeof deployedRoleName === 'string' && deployedRoleName.length > 0) {
    return deployedRoleName;
  }
  const { resourceName } = functionResource;
  const templatePath = path.join(
    pathManager.getResourceDirectoryPath(undefined, AmplifyCategories.FUNCTION, resourceName),
    `${resourceName}${FUNCTION_CFN_TEMPLATE_SUFFIX}`,
  );
  if (!fs.existsSync(templatePath)) {
    return undefined;
  }
  try {
    const { cfnTemplate } = readCFNTemplate(templatePath);
    return resolveStaticCfnValue(cfnTemplate?.Resources?.[LAMBDA_EXECUTION_ROLE_LOGICAL_ID]?.Properties?.RoleName, currentEnv);
  } catch (err) {
    return undefined;
  }
};

/**
 * Normalizes a `custom-roles.json` entry into the role-name shape the generated resolvers compare against, returning `undefined`
 * for a value that can never match a caller identity.
 */
const normalizeCustomAdminRoleName = (adminRoleName: string, customRoleFile: string): string | undefined => {
  const assumedRoleArnMatch = STS_ASSUMED_ROLE_ARN_PATTERN.exec(adminRoleName);
  if (assumedRoleArnMatch) {
    return assumedRoleArnMatch[1];
  }
  if (adminRoleName.startsWith('arn:')) {
    printer.warn(
      `Ignoring "${adminRoleName}" in ${customRoleFile}: an IAM role arn never appears in the caller identity that admin access is ` +
        'checked against, so it would silently grant nothing. Use the IAM role name instead.',
    );
    return undefined;
  }
  return adminRoleName;
};

/**
 * Collects the IAM identities that are granted admin access to the API regardless of its auth rules.
 *
 * Every entry is role-name shaped, either a bare `<RoleName>` or a qualified `<RoleName>/<SessionName>`, because the generated
 * resolvers match each entry against the `assumed-role/` segment of the caller arn. A fully qualified arn is never returned.
 */
export const getAdminRoles = async (ctx: $TSContext, apiResourceName: string | undefined): Promise<Array<string>> => {
  let currentEnv;
  const adminRoles = new Array<string>();

  try {
    currentEnv = ctx.amplify.getEnvInfo().envName;
  } catch (err) {
    // When there is no environment info, return [] - This is required for sandbox pull
    return [];
  }

  // admin ui roles
  try {
    const amplifyMeta = stateManager.getMeta();
    const appId = amplifyMeta?.providers?.[PROVIDER_NAME]?.AmplifyAppId;
    const res = await CloudformationProviderFacade.isAmplifyAdminApp(ctx, appId);
    if (res.userPoolID) {
      adminRoles.push(`${res.userPoolID}${AMPLIFY_ADMIN_ROLE}`, `${res.userPoolID}${AMPLIFY_MANAGE_ROLE}`);
    }
  } catch (err) {
    // no need to error if not admin ui app
  }

  // additonal admin role checks
  if (apiResourceName) {
    // lambda functions which have access to the api
    const { allResources, resourcesToBeDeleted } = await ctx.amplify.getResourceStatus('function');
    const functionResources = pullAllBy(allResources, resourcesToBeDeleted, 'resourceName').filter((r: any) =>
      r.dependsOn?.some((d: any) => d?.resourceName === apiResourceName),
    );
    functionResources.forEach((functionResource: any) => {
      // A function's deployed name only ever appears in the session segment of the caller arn, which the caller chooses freely, so
      // the execution role name is the only part of a function's identity that can be trusted.
      const executionRoleName = getFunctionExecutionRoleName(functionResource, currentEnv);
      if (executionRoleName) {
        adminRoles.push(executionRoleName);
        return;
      }
      printer.warn(
        `Unable to determine the Lambda execution role name of function "${functionResource.resourceName}", so it is not granted ` +
          `admin access to the "${apiResourceName}" GraphQL API. Add its execution role name to "adminRoleNames" in ` +
          `${CUSTOM_ROLES_FILE_NAME} to grant access.`,
      );
    });

    // check for custom iam admin roles
    const customRoleFile = path.join(
      pathManager.getResourceDirectoryPath(undefined, AmplifyCategories.API, apiResourceName),
      CUSTOM_ROLES_FILE_NAME,
    );
    if (fs.existsSync(customRoleFile)) {
      const customRoleConfig = JSONUtilities.readJson<CustomRolesConfig>(customRoleFile);
      if (customRoleConfig && customRoleConfig.adminRoleNames) {
        const customAdminRoles = Array.isArray(customRoleConfig.adminRoleNames)
          ? customRoleConfig.adminRoleNames
          : [customRoleConfig.adminRoleNames];
        const adminRoleNames = customAdminRoles
          .map((r) => r.replace(ENV_PLACEHOLDER_PATTERN, currentEnv))
          .map((r) => normalizeCustomAdminRoleName(r, customRoleFile))
          .filter((r): r is string => r !== undefined);
        adminRoles.push(...adminRoleNames);
      }
    }
  }
  return adminRoles;
};

export function mergeUserConfigWithTransformOutput(
  userConfig: TransformerProjectConfig,
  transformOutput: DeploymentResources,
  opts?: any,
): DeploymentResources {
  const userFunctions = userConfig.functions || {};
  const userResolvers = userConfig.resolvers || {};
  const userPipelineFunctions = userConfig.pipelineFunctions || {};
  const { functions } = transformOutput;
  const { resolvers } = transformOutput;
  const { pipelineFunctions } = transformOutput;

  if (!opts?.disableFunctionOverrides) {
    for (const userFunction of Object.keys(userFunctions)) {
      functions[userFunction] = userFunctions[userFunction];
    }
  }

  if (!opts?.disablePipelineFunctionOverrides) {
    const pipelineFunctionKeys = Object.keys(userPipelineFunctions);

    if (pipelineFunctionKeys.length > 0) {
      printer.warn(
        ' You are using the "pipelineFunctions" directory for overridden and custom resolvers. ' +
          'Please use the "resolvers" directory as "pipelineFunctions" will be deprecated.\n',
      );
    }

    for (const userPipelineFunction of pipelineFunctionKeys) resolvers[userPipelineFunction] = userPipelineFunctions[userPipelineFunction];
  }

  if (!opts?.disableResolverOverrides) {
    for (const userResolver of Object.keys(userResolvers)) {
      if (userResolver !== 'README.md') {
        resolvers[userResolver] = userResolvers[userResolver].toString();
      }
    }
  }

  const stacks = overrideUserDefinedStacks(userConfig, transformOutput);

  return {
    ...transformOutput,
    functions,
    resolvers,
    pipelineFunctions,
    stacks,
  };
}

function overrideUserDefinedStacks(userConfig: TransformerProjectConfig, transformOutput: DeploymentResources) {
  const userStacks = userConfig.stacks || {};
  const { stacks, rootStack } = transformOutput;

  const resourceTypesToDependOn = {
    'AWS::CloudFormation::Stack': true,
    'AWS::AppSync::GraphQLApi': true,
    'AWS::AppSync::GraphQLSchema': true,
  };

  const allResourceIds = Object.keys(rootStack.Resources).filter((k: string) => {
    const resource = rootStack.Resources[k];
    return resourceTypesToDependOn[resource.Type];
  });

  const parametersKeys = Object.keys(rootStack.Parameters);
  const customStackParams = parametersKeys.reduce(
    (acc: any, k: string) => ({
      ...acc,
      [k]: Fn.Ref(k),
    }),
    {},
  );

  customStackParams[ResourceConstants.PARAMETERS.AppSyncApiId] = Fn.GetAtt(ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId');

  const updatedParameters = rootStack.Parameters;

  for (const userStack of Object.keys(userStacks)) {
    if (stacks[userStack]) {
      throw new Error(`You cannot provide a stack named ${userStack} as it \
            will be overwritten by a stack generated by the GraphQL Transform.`);
    }
    const userDefinedStack = userStacks[userStack];

    for (const key of Object.keys(userDefinedStack.Parameters)) {
      if (customStackParams[key] == null) {
        customStackParams[key] = Fn.Ref(key);

        if (updatedParameters[key]) throw new Error(`Cannot redefine CloudFormation parameter ${key} in stack ${userStack}.`);
        else updatedParameters[key] = userDefinedStack.Parameters[key];
      }
    }

    const parametersForStack = Object.keys(userDefinedStack.Parameters).reduce(
      (acc, k) => ({
        ...acc,
        [k]: customStackParams[k],
      }),
      {},
    );

    stacks[userStack] = userDefinedStack;

    const stackResourceId = userStack.split(/[^A-Za-z]/).join('');
    const customNestedStack = new CloudFormation.Stack({
      Parameters: parametersForStack,
      TemplateURL: Fn.Join('/', [
        'https://s3.amazonaws.com',
        Fn.Ref(ResourceConstants.PARAMETERS.S3DeploymentBucket),
        Fn.Ref(ResourceConstants.PARAMETERS.S3DeploymentRootKey),
        'stacks',
        userStack,
      ]),
    }).dependsOn(allResourceIds);
    rootStack.Resources[stackResourceId] = customNestedStack;
  }

  rootStack.Parameters = updatedParameters;

  return stacks;
}

/**
 * Writes a deployment to disk at a path.
 */
export async function writeDeploymentToDisk(
  context: $TSContext,
  deployment: DeploymentResources,
  directory: string,
  rootStackFileName = 'rootStack.json',
  buildParameters: Object,
) {
  fs.ensureDirSync(directory);
  // Delete the last deployments resources except for tsconfig if present
  emptyBuildDirPreserveTsconfig(directory);

  // Write the schema to disk
  const { schema } = deployment;
  const fullSchemaPath = path.normalize(`${directory}/schema.graphql`);
  fs.writeFileSync(fullSchemaPath, schema);

  // Setup the directories if they do not exist.
  initStacksAndResolversDirectories(directory);

  // Write resolvers to disk
  const resolverFileNames = Object.keys(deployment.resolvers);
  const resolverRootPath = resolverDirectoryPath(directory);
  for (const resolverFileName of resolverFileNames) {
    const fullResolverPath = path.normalize(`${resolverRootPath}/${resolverFileName}`);
    fs.writeFileSync(fullResolverPath, deployment.resolvers[resolverFileName]);
  }

  // Write pipeline resolvers to disk
  const pipelineFunctions = Object.keys(deployment.pipelineFunctions);
  const pipelineFunctionRootPath = pipelineFunctionDirectoryPath(directory);
  for (const functionFileName of pipelineFunctions) {
    const fullTemplatePath = path.normalize(`${pipelineFunctionRootPath}/${functionFileName}`);
    fs.writeFileSync(fullTemplatePath, deployment.pipelineFunctions[functionFileName]);
  }

  // Write the stacks to disk
  const stackNames = Object.keys(deployment.stacks);
  const stackRootPath = stacksDirectoryPath(directory);
  for (const stackFileName of stackNames) {
    const fileNameParts = stackFileName.split('.');
    if (fileNameParts.length === 1) {
      fileNameParts.push('json');
    }
    const fullFileName = fileNameParts.join('.');
    throwIfNotJSONExt(fullFileName);
    const fullStackPath = path.normalize(`${stackRootPath}/${fullFileName}`);
    let stackContent = deployment.stacks[stackFileName];
    if (typeof stackContent === 'string') {
      stackContent = JSON.parse(stackContent);
    }
    await CloudformationProviderFacade.prePushCfnTemplateModifier(context, stackContent);
    fs.writeFileSync(fullStackPath, JSONUtilities.stringify(stackContent));
  }

  // Write any functions to disk
  const functionNames = Object.keys(deployment.functions);
  const functionRootPath = path.normalize(`${directory}/functions`);
  if (!fs.existsSync(functionRootPath)) {
    fs.mkdirSync(functionRootPath);
  }
  for (const functionName of functionNames) {
    const fullFunctionPath = path.normalize(`${functionRootPath}/${functionName}`);
    const zipContents = fs.readFileSync(deployment.functions[functionName]);
    fs.writeFileSync(fullFunctionPath, zipContents);
  }
  const { rootStack } = deployment;
  const rootStackPath = path.normalize(`${directory}/${rootStackFileName}`);
  const rootStackString = JSON.stringify(rootStack, null, 4);
  fs.writeFileSync(rootStackPath, rootStackString);

  // Write params to disk
  const jsonString = JSON.stringify(buildParameters, null, 4);
  const parametersOutputFilePath = path.join(directory, PARAMETERS_FILE_NAME);
  fs.writeFileSync(parametersOutputFilePath, jsonString);
}

function initStacksAndResolversDirectories(directory: string) {
  const resolverRootPath = resolverDirectoryPath(directory);
  if (!fs.existsSync(resolverRootPath)) {
    fs.mkdirSync(resolverRootPath);
  }
  const stackRootPath = stacksDirectoryPath(directory);
  if (!fs.existsSync(stackRootPath)) {
    fs.mkdirSync(stackRootPath);
  }
}

function pipelineFunctionDirectoryPath(rootPath: string) {
  return path.normalize(path.join(rootPath, 'pipelineFunctions'));
}

function resolverDirectoryPath(rootPath: string) {
  return path.normalize(`${rootPath}/resolvers`);
}

function stacksDirectoryPath(rootPath: string) {
  return path.normalize(`${rootPath}/stacks`);
}

function throwIfNotJSONExt(stackFile: string) {
  const extension = path.extname(stackFile);
  if (extension === '.yaml' || extension === '.yml') {
    throw new Error(`Yaml is not yet supported. Please convert the CloudFormation stack ${stackFile} to json.`);
  }
  if (extension !== '.json') {
    throw new Error(`Invalid extension ${extension} for stack ${stackFile}`);
  }
}

const emptyBuildDirPreserveTsconfig = (directory: string) => {
  const files = fs.readdirSync(directory);
  files.forEach((file) => {
    const fileDir = path.join(directory, file);
    if (fs.lstatSync(fileDir).isDirectory()) {
      rimraf.sync(fileDir);
    } else if (!file.endsWith('tsconfig.resource.json')) {
      fs.unlinkSync(fileDir);
    }
  });
};
