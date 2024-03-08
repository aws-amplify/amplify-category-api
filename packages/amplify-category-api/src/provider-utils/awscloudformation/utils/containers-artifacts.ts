import * as path from 'path';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs-extra';
import inquirer from 'inquirer';
import { v4 as uuid } from 'uuid';
import { $TSContext, JSONUtilities, pathManager, readCFNTemplate } from '@aws-amplify/amplify-cli-core';
import * as cdk from 'aws-cdk-lib';
import { provider as cloudformationProviderName } from '../../../provider-utils/awscloudformation/aws-constants';
import { getContainers } from '../../../provider-utils/awscloudformation/docker-compose';
import Container from '../docker-compose/ecs-objects/container';
import { EcsStack } from '../ecs-apigw-stack';
import { API_TYPE, ResourceDependency } from '../../../provider-utils/awscloudformation/service-walkthroughs/containers-walkthrough';
import { getGitHubOwnerRepoFromPath } from '../../../provider-utils/awscloudformation/utils/github';
import { DEPLOYMENT_MECHANISM } from '../base-api-stack';
import { category } from '../../../category-constants';
import { setExistingSecretArns } from './containers/set-existing-secret-arns';

export const cfnFileName = (resourceName: string) => `${resourceName}-cloudformation-template.json`;

export type ApiResource = {
  category: string;
  resourceName: string;
  gitHubInfo?: {
    path: string;
    tokenSecretArn: string;
  };
  deploymentMechanism: DEPLOYMENT_MECHANISM;
  authName: string;
  restrictAccess: boolean;
  dependsOn: ResourceDependency[];
  environmentMap: Record<string, string>;
  categoryPolicies: any[];
  mutableParametersState: any;
  output?: Record<string, any>;
  apiType?: API_TYPE;
  exposedContainer?: { name: string; port: number };
};

type ExposedContainer = {
  name: string;
  port: number;
};

type ContainerArtifactsMetadata = {
  exposedContainer: ExposedContainer;
  pipelineInfo: { consoleUrl: string };
};

export async function generateContainersArtifacts(
  context: $TSContext,
  resource: ApiResource,
  askForExposedContainer: boolean = false,
): Promise<ContainerArtifactsMetadata> {
  const {
    providers: { [cloudformationProviderName]: provider },
  } = context.amplify.getProjectMeta();

  const { StackName: envName } = provider;

  const {
    category: categoryName,
    resourceName,
    gitHubInfo,
    deploymentMechanism,
    categoryPolicies = [],
    dependsOn,
    environmentMap,
    restrictAccess,
    apiType,
  } = resource;

  const backendDir = context.amplify.pathManager.getBackendDirPath();
  const resourceDir = path.normalize(path.join(backendDir, categoryName, resourceName));
  const srcPath = path.join(resourceDir, 'src');

  const { containersPorts, containers, isInitialDeploy, desiredCount, exposedContainer, secretsArns } = await processDockerConfig(
    context,
    resource,
    srcPath,
    askForExposedContainer,
  );

  console.log('Before Execute Provider Utils: describeEcrRepositories');
  const repositories = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'describeEcrRepositories');
  console.log('After Execute Provider Utils: describeEcrRepositories');

  console.log('Before map repositories');
  const existingEcrRepositories: Set<string> = new Set(
    repositories
      .map(({ repositoryName }) => repositoryName)
      .filter((repositoryName) => repositoryName.startsWith(`${envName}-${categoryName}-${resourceName}-`)),
  );
  console.log('After map repositories');

  const stack = new EcsStack(undefined, 'ContainersStack', {
    categoryName,
    apiName: resourceName,
    taskPorts: containersPorts,
    dependsOn,
    policies: categoryPolicies,
    taskEnvironmentVariables: environmentMap,
    gitHubSourceActionInfo: gitHubInfo,
    deploymentMechanism,
    containers,
    isInitialDeploy,
    desiredCount,
    restrictAccess,
    currentStackName: envName,
    apiType,
    exposedContainer,
    secretsArns,
    existingEcrRepositories,
  });

  console.log('After New EcsStack');

  const cfn = stack.toCloudFormation();

  console.log('After toCloudFormation');

  JSONUtilities.writeJson(path.normalize(path.join(resourceDir, cfnFileName(resourceName))), cfn);

  return {
    exposedContainer,
    pipelineInfo: { consoleUrl: stack.getPipelineConsoleUrl(provider.Region) },
  };
}

export async function processDockerConfig(
  context: $TSContext,
  resource: ApiResource,
  srcPath: string,
  askForExposedContainer: boolean = false,
) {
  const {
    providers: { [cloudformationProviderName]: provider },
  } = context.amplify.getProjectMeta();

  const { StackName: envName } = provider;

  const { resourceName, gitHubInfo, deploymentMechanism, output, exposedContainer: exposedContainerFromMeta } = resource;

  const dockerComposeFileNameYaml = 'docker-compose.yaml';
  const dockerComposeFileNameYml = 'docker-compose.yml';
  const dockerfileFileName = 'Dockerfile';

  const containerDefinitionFileNames = [dockerComposeFileNameYaml, dockerComposeFileNameYml, dockerfileFileName];

  const containerDefinitionFiles: Record<string, string> = {};

  for await (const fileName of containerDefinitionFileNames) {
    switch (deploymentMechanism) {
      case DEPLOYMENT_MECHANISM.FULLY_MANAGED:
      case DEPLOYMENT_MECHANISM.SELF_MANAGED: {
        const filePath = path.normalize(path.join(srcPath, fileName));

        if (fs.existsSync(filePath)) {
          containerDefinitionFiles[fileName] = fs.readFileSync(filePath).toString();
        }
        break;
      }
      case DEPLOYMENT_MECHANISM.INDENPENDENTLY_MANAGED: {
        const { path: repoUri, tokenSecretArn } = gitHubInfo;

        const { SecretString: gitHubToken } = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'retrieveSecret', {
          secretArn: tokenSecretArn,
        });

        const octokit = new Octokit({ auth: gitHubToken });

        const { owner, repo, branch, path: pathInRepo } = getGitHubOwnerRepoFromPath(repoUri);

        try {
          const {
            data: { content, encoding },
          } = (await octokit.repos.getContent({
            owner,
            repo,
            ...(branch ? { ref: branch } : undefined), // only include branch if not undefined
            path: path.join(pathInRepo, fileName),
          })) as { data: { content?: string; encoding?: string } };

          containerDefinitionFiles[fileName] = Buffer.from(content, <BufferEncoding>encoding).toString('utf8');
        } catch (error) {
          const { status } = error;

          // It is ok if the file doesn't exist, we skip it
          if (status !== 404) {
            throw error;
          }
        }
        break;
      }
      default: {
        const exhaustiveCheck: never = deploymentMechanism;
        throw new Error(`Unhandled type [${exhaustiveCheck}]`);
      }
    }
  }

  if (Object.keys(containerDefinitionFiles).length === 0) {
    throw new Error('No definition available (docker-compose.yaml / docker-compose.yml / Dockerfile)');
  }

  if (containerDefinitionFiles[dockerComposeFileNameYaml] && containerDefinitionFiles[dockerComposeFileNameYml]) {
    throw new Error('There should be only one docker-compose.yaml / docker-compose.yml)');
  }

  const composeContents = containerDefinitionFiles[dockerComposeFileNameYaml] || containerDefinitionFiles[dockerComposeFileNameYml];
  const { [dockerfileFileName]: dockerfileContents } = containerDefinitionFiles;

  const { buildspec, containers, service, secrets } = getContainers(composeContents, dockerfileContents);

  const containersPorts = containers.reduce(
    (acc, container) => acc.concat(container.portMappings.map(({ containerPort }) => containerPort)),
    <number[]>[],
  );

  const newContainersName = Array.from(new Set(containers.map(({ name }) => name)));

  let isInitialDeploy = Object.keys(output ?? {}).length === 0;
  const currentContainersSet = new Set(output?.ContainerNames?.split(','));
  // Service require all containers to exists
  isInitialDeploy = isInitialDeploy || newContainersName.some((newContainer) => !currentContainersSet.has(newContainer));

  let exposedContainer: { name: string; port: number };

  const containersExposed = containers.filter((container) => container.portMappings.length > 0);

  if (containersPorts.length === 0) {
    throw new Error('Service requires at least one exposed port');
  } else if (containersPorts.length > 1) {
    exposedContainer = await checkContainerExposed(containersExposed, exposedContainerFromMeta, askForExposedContainer);
  } else {
    exposedContainer = {
      name: containersExposed[0].name,
      port: containersExposed[0].portMappings[0].containerPort,
    };
  }

  console.log('Exposed container - Outside scope:');
  console.log(JSON.stringify(exposedContainer, null, 2));

  fs.ensureDirSync(srcPath);
  fs.writeFileSync(path.join(srcPath, 'buildspec.yml'), buildspec);

  const secretsArns: Map<string, string> = new Map<string, string>();

  console.log('Secrets - before If block:');
  console.log(JSON.stringify(secrets, null, 2));

  console.log('Is initial deploy:');
  console.log(JSON.stringify(isInitialDeploy));

  if ((await shouldUpdateSecrets(context, secrets)) || isInitialDeploy) {
    // Normalizes paths
    // Validate secrets file paths, existence and prefixes
    const errors = Object.entries(secrets).reduce((acc, [secretName, secretFilePath]) => {
      const baseDir = path.isAbsolute(secretFilePath) ? '' : srcPath;
      const normalizedFilePath = path.normalize(path.join(baseDir, secretFilePath));

      secrets[secretName] = normalizedFilePath;

      let canRead = true;

      try {
        const fd = fs.openSync(normalizedFilePath, 'r');

        fs.closeSync(fd);
      } catch (err) {
        canRead = false;
      }

      if (!canRead) {
        acc.push(`Secret file "${secretFilePath}" can't be read.`);
        return acc;
      }

      const basename = path.basename(normalizedFilePath);
      const hasCorrectPrefix = basename.startsWith('.secret-');

      if (!hasCorrectPrefix) {
        acc.push(`Secret file "${secretFilePath}" doesn't start with the ".secret-" prefix.`);
        return acc;
      }

      const isInsideSrc = normalizedFilePath.startsWith(path.join(srcPath, path.sep));
      if (isInsideSrc) {
        acc.push(`Secret file "${secretFilePath}" should not be inside the "src" folder. The "src" folder will be uploaded to S3.`);
        return acc;
      }

      return acc;
    }, <string[]>[]);

    if (errors.length > 0) {
      throw new Error(['Error(s) in secret file(s):'].concat(errors).join('\n'));
    }

    console.log('Secrets - for await:');
    console.log(JSON.stringify(secrets, null, 2));

    for await (const entries of Object.entries(secrets)) {
      const [secretName, secretFilePath] = entries;

      const contents = fs.readFileSync(secretFilePath).toString();

      const ssmSecretName = `${envName}-${resourceName}-${secretName}`;

      const { ARN: secretArn } = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'upsertSecretValue', {
        secret: contents,
        description: `Secret for ${resourceName}`,
        name: ssmSecretName,
        version: uuid(),
      });

      const [prefix] = secretArn.toString().split(ssmSecretName);
      const secretArnRef = cdk.Fn.join('', [prefix, cdk.Fn.ref('rootStackName'), '-', resourceName, '-', secretName]);

      secretsArns.set(secretName, secretArnRef);
    }
  } else {
    const { cfnTemplate } = readCFNTemplate(path.join(pathManager.getBackendDirPath(), category, resourceName, cfnFileName(resourceName)));
    setExistingSecretArns(secretsArns, cfnTemplate);
  }

  const desiredCount = service?.replicas ?? 1; // TODO: 1 should be from meta (HA setting)

  return {
    containersPorts,
    containers,
    isInitialDeploy,
    desiredCount,
    exposedContainer,
    secretsArns,
  };
}

async function shouldUpdateSecrets(context: $TSContext, secrets: Record<string, string>): Promise<boolean> {
  const hasSecrets = Object.keys(secrets).length > 0;

  if (!hasSecrets || context.exeInfo.inputParams.yes) {
    return false;
  }

  const { update_secrets } = await inquirer.prompt({
    name: 'update_secrets',
    type: 'confirm',
    message: 'Secret configuration detected. Do you wish to store new values in the cloud?',
    default: false,
  });

  return update_secrets;
}

async function checkContainerExposed(
  containersExposed: Container[],
  exposedContainerFromMeta: { name: string; port: number } = { name: '', port: 0 },
  askForExposedContainer: boolean = false,
): Promise<{ name: string; port: number }> {
  const containerExposed = containersExposed.find((container) => container.name === exposedContainerFromMeta.name);

  if (!askForExposedContainer && containerExposed?.portMappings.find((port) => port.containerPort === exposedContainerFromMeta.port)) {
    return { ...exposedContainerFromMeta };
  } else {
    const choices: { name: string; value: Container }[] = containersExposed.map((container) => ({
      name: container.name,
      value: container,
    }));

    console.log('Containers found:');
    console.log(JSON.stringify(choices, null, 2));

    const { containerToExpose } = await inquirer.prompt({
      message: 'Select which container is the entrypoint',
      name: 'containerToExpose',
      type: 'list',
      choices,
    });

    console.log('Container exposed:');
    console.log(JSON.stringify(containerToExpose, null, 2));

    return {
      name: containerToExpose.name,
      port: containerToExpose.portMappings[0].containerPort,
    };
  }
}
