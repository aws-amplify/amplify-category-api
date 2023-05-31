import fs from 'fs-extra';
import * as path from 'path';
import {
  DeploymentResources,
  AmplifyApiGraphQlResourceStackTemplate,
  TransformerResolverProvider,
  AppsyncStackCommon,
  FunctionDirectiveStack,
  HttpsDirectiveStack,
  ModelDirectiveStack,
  OpenSearchDirectiveStack,
} from '@aws-amplify/graphql-transformer-interfaces';
import { TransformerProjectConfig, SyncUtils } from '@aws-amplify/graphql-transformer-core';
import rimraf from 'rimraf';
import {
  $TSContext, AmplifyCategories, CloudformationProviderFacade, JSONUtilities, pathManager, stateManager,
} from '@aws-amplify/amplify-cli-core';
import { CloudFormation, Fn } from 'cloudform-types';
import { ResourceConstants } from 'graphql-transformer-common';
import { pullAllBy, find } from 'lodash';
import { printer } from '@aws-amplify/amplify-prompts';
import { CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import _ from 'lodash';
import { ConstructResourceMeta } from './types';


const PARAMETERS_FILE_NAME = 'parameters.json';
const CUSTOM_ROLES_FILE_NAME = 'custom-roles.json';
const AMPLIFY_ADMIN_ROLE = '_Full-access/CognitoIdentityCredentials';
const AMPLIFY_MANAGE_ROLE = '_Manage-only/CognitoIdentityCredentials';
const PROVIDER_NAME = 'awscloudformation';

interface CustomRolesConfig {
  adminRoleNames?: Array<string>;
}

export const getIdentityPoolId = async (ctx: $TSContext): Promise<string | undefined> => {
  const { allResources, resourcesToBeDeleted } = await ctx.amplify.getResourceStatus('auth');
  const authResources = pullAllBy(allResources, resourcesToBeDeleted, 'resourceName');
  const authResource = find(authResources, { service: 'Cognito', providerPlugin: PROVIDER_NAME }) as any;
  return authResource?.output?.IdentityPoolId;
};

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
    const resources = pullAllBy(allResources, resourcesToBeDeleted, 'resourceName')
      .filter((r: any) => r.dependsOn?.some((d: any) => d?.resourceName === apiResourceName))
      .map((r: any) => `${r.resourceName}-${currentEnv}`);
    adminRoles.push(...resources);

    // check for custom iam admin roles
    const customRoleFile = path.join(
      pathManager.getResourceDirectoryPath(undefined, AmplifyCategories.API, apiResourceName),
      CUSTOM_ROLES_FILE_NAME,
    );
    if (fs.existsSync(customRoleFile)) {
      const customRoleConfig = JSONUtilities.readJson<CustomRolesConfig>(customRoleFile);
      if (customRoleConfig && customRoleConfig.adminRoleNames) {
        const adminRoleNames = customRoleConfig.adminRoleNames
          // eslint-disable-next-line no-template-curly-in-string
          .map((r) => (r.includes('${env}') ? r.replace('${env}', currentEnv) : r));
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
        ' You are using the "pipelineFunctions" directory for overridden and custom resolvers. '
          + 'Please use the "resolvers" directory as "pipelineFunctions" will be deprecated.\n',
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

export const getDeltaSyncTableTtl = (resourceOverrides: AmplifyApiGraphQlResourceStackTemplate, resource: TransformerResolverProvider): number => {
  if (_.get(resource, 'typeName') !== 'Query') {
    return SyncUtils.syncDataSourceConfig().DeltaSyncTableTTL;
  }
  const modelName = _.get(resource, ['datasource', 'name'])?.replace(new RegExp('Table$'), '');
  const deltaSyncTtlOverride = _.get(resourceOverrides, ['models', modelName, 'modelDatasource', 'dynamoDbConfig', 'deltaSyncConfig', 'deltaSyncTableTtl']);
  return deltaSyncTtlOverride || SyncUtils.syncDataSourceConfig().DeltaSyncTableTTL;
}

export const stacksTypes: Record<string, string> = {
  API: 'api',
  MODELS: 'models',
  HttpStack: 'http',
  FunctionDirectiveStack: 'function',
  PredictionsDirectiveStack: 'predictions',
  SearchableStack: 'openSearch',
};

const rootStackNameInConstruct = 'transformer-root-stack';

export const getStackMeta = (constructPathArr: string[], id: string, nestedStackArr: string[], node: Construct): ConstructResourceMeta => {
  const resource = node as CfnResource;
  if (nestedStackArr.find(val => val === constructPathArr[1])) {
    const nestedStackName = nestedStackArr.find(val => val === constructPathArr[1]);
    const resourceName = constructPathArr.filter(path => path !== nestedStackName && path !== rootStackNameInConstruct).join('');
    return {
      resourceName,
      resourceType: resource.cfnResourceType,
      nestedStack: {
        stackName: nestedStackName!,
        stackType: stacksTypes[nestedStackName!] ?? stacksTypes['MODELS'],
      },
    };
  } else {
    // root stack
    const resourceName = constructPathArr.filter(path => path !== rootStackNameInConstruct).join('');
    return {
      resourceName: id === 'Resource' ? resourceName : `${resourceName}${id}`,
      resourceType: resource.cfnResourceType,
      rootStack: {
        stackName: constructPathArr[0],
        stackType: stacksTypes.API,
      },
    };
  }
};

export const convertToAppsyncResourceObj = (amplifyObj: any) => {
  let appsyncResourceObject: AmplifyApiGraphQlResourceStackTemplate = {};
  Object.keys(amplifyObj).forEach(keys => {
    if (keys === 'api') {
      appsyncResourceObject.api = amplifyObj.api;
    } else if (keys === 'models' && !_.isEmpty(amplifyObj[keys])) {
      // require filter using keyName
      appsyncResourceObject.models = {};
      Object.keys(amplifyObj.models).forEach(key => {
        appsyncResourceObject.models![key] = generateModelDirectiveObject(amplifyObj.models[key]);
      });
    } else if (keys === 'function' && !_.isEmpty(amplifyObj[keys])) {
      const functionStackObj = amplifyObj.function.FunctionDirectiveStack;
      appsyncResourceObject.function = generateFunctionDirectiveObject(functionStackObj);
    } else if (keys === 'http' && !_.isEmpty(amplifyObj[keys])) {
      const httpStackObj = amplifyObj.http.HttpStack;
      appsyncResourceObject.http = generateHttpDirectiveObject(httpStackObj);
    } else if (keys === 'openSearch' && !_.isEmpty(amplifyObj[keys])) {
      const openSearchStackObj = amplifyObj.openSearch.SearchableStack;
      appsyncResourceObject.opensearch = generateOpenSearchDirectiveObject(openSearchStackObj);
    } else if (keys === 'predictions' && !_.isEmpty(amplifyObj[keys])) {
      appsyncResourceObject.predictions = amplifyObj.predictions.PredictionsDirectiveStack;
      if (!_.isEmpty(amplifyObj.predictions.PredictionsDirectiveStack['predictionsLambda.handler'])) {
        appsyncResourceObject.predictions!.predictionsLambdaFunction =
          amplifyObj.predictions.PredictionsDirectiveStack['predictionsLambda.handler'];
      }
    }
  });
  return appsyncResourceObject;
};

const generateFunctionDirectiveObject = (functionStackObj: any) => {
  let functionObj: Partial<FunctionDirectiveStack & AppsyncStackCommon> = {};
  Object.keys(functionStackObj).forEach(key => {
    if (key.endsWith('resolvers')) {
      functionObj.resolvers = functionStackObj.resolvers;
    } else if (key.endsWith('appsyncFunctions')) {
      functionObj.appsyncFunctions = functionStackObj.appsyncFunctions;
    } else if (functionStackObj[key].cfnResourceType.includes('DataSource')) {
      if (!functionObj.lambdaDataSource) {
        functionObj.lambdaDataSource = {};
      }
      const name = key.substring(0, key.indexOf('LambdaDataSource'));
      functionObj.lambdaDataSource[name] = functionStackObj[key];
    } else if (functionStackObj[key].cfnResourceType.includes('Role')) {
      if (!functionObj.lambdaDataSourceRole) {
        functionObj.lambdaDataSourceRole = {};
      }
      const name = key.substring(0, key.indexOf('LambdaDataSourceServiceRole'));
      functionObj.lambdaDataSourceRole[name] = functionStackObj[key];
    } else if (functionStackObj[key].cfnResourceType.includes('Policy')) {
      if (!functionObj.lambdaDataSourceServiceRoleDefaultPolicy) {
        functionObj.lambdaDataSourceServiceRoleDefaultPolicy = {};
      }
      const name = key.substring(0, key.indexOf('LambdaDataSourceServiceRoleDefaultPolicy'));
      functionObj.lambdaDataSourceServiceRoleDefaultPolicy[name] = functionStackObj[key];
    }
  });
  return functionObj;
};

const generateHttpDirectiveObject = (httpStackObj: any) => {
  let httpObj: Partial<HttpsDirectiveStack & AppsyncStackCommon> = {};
  Object.keys(httpStackObj).forEach(key => {
    if (key.endsWith('resolvers')) {
      httpObj.resolvers = httpStackObj.resolvers;
    } else if (key.endsWith('appsyncFunctions')) {
      httpObj.appsyncFunctions = httpStackObj.appsyncFunctions;
    } else if (httpStackObj[key].cfnResourceType.includes('DataSource')) {
      if (!httpObj.httpsDataSource) {
        httpObj.httpsDataSource = {};
      }
      const name = key.substring(0, key.indexOf('DataSource'));
      httpObj.httpsDataSource[name] = httpStackObj[key];
    } else if (httpStackObj[key].cfnResourceType.includes('Role')) {
      if (!httpObj.httpDataSourceServiceRole) {
        httpObj.httpDataSourceServiceRole = {};
      }
      const name = key.substring(0, key.indexOf('DataSourceServiceRole'));
      httpObj.httpDataSourceServiceRole[name] = httpStackObj[key];
    }
  });
  return httpObj;
};

const generateOpenSearchDirectiveObject = (opensearchStackObj: any) => {
  let opensearchObj: OpenSearchDirectiveStack & AppsyncStackCommon = _.pick(
    opensearchStackObj,
    'OpenSearchDataSource',
    'OpenSearchAccessIAMRole',
    'OpenSearchAccessIAMRoleDefaultPolicy',
    'OpenSearchDomain',
    'OpenSearchStreamingLambdaIAMRole',
    'OpenSearchStreamingLambdaIAMRoleDefaultPolicy',
    'CloudwatchLogsAccess',
    'OpenSearchStreamingLambdaFunction',
    'resolvers',
    'appsyncFunctions',
  );

  Object.keys(opensearchStackObj).forEach(key => {
    if (key !== 'resolvers' && key !== 'appsyncFunctions' && opensearchStackObj[key].cfnResourceType.includes('EventSourceMapping')) {
      if (!opensearchObj.OpenSearchModelLambdaMapping) {
        opensearchObj.OpenSearchModelLambdaMapping = {};
      }
      // filter ModelName fromm logicalID
      const name = key.substring(0, key.indexOf('LambdaMapping'));
      const modeName = key.substring('Searchable'.length, name.length);
      opensearchObj.OpenSearchModelLambdaMapping[modeName] = opensearchStackObj[key];
    }
  });
  return opensearchObj;
};

const generateModelDirectiveObject = (modelStackObj: any) => {
  let modelObj: ModelDirectiveStack = _.pick(modelStackObj, 'appsyncFunctions', 'DynamoDBAccess', 'InvokdeLambdaFunction', 'resolvers');
  let strippedModelObj = _.omit(modelStackObj, 'appsyncFunctions', 'DynamoDBAccess', 'InvokdeLambdaFunction', 'resolvers');
  Object.keys(strippedModelObj).forEach(key => {
    if (strippedModelObj[key].cfnResourceType.includes('DataSource')) {
      modelObj.modelDatasource = modelStackObj[key];
    }
    if (strippedModelObj[key].cfnResourceType.includes('Role')) {
      modelObj.modelIamRole = modelStackObj[key];
    }
    if (strippedModelObj[key].cfnResourceType.includes('Policy')) {
      modelObj.modelIamRoleDefaultPolicy = modelStackObj[key];
    }
    if (strippedModelObj[key].cfnResourceType.includes('Table')) {
      modelObj.modelDDBTable = modelStackObj[key];
    }
  });
  return modelObj;
};
