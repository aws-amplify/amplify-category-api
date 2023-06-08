import { DynamoDBModelTransformer } from 'graphql-dynamodb-transformer';
import { ModelAuthTransformer } from 'graphql-auth-transformer';
import { ModelConnectionTransformer } from 'graphql-connection-transformer';
import { SearchableModelTransformer } from 'graphql-elasticsearch-transformer';
import { VersionedModelTransformer } from 'graphql-versioned-transformer';
import { FunctionTransformer } from 'graphql-function-transformer';
import { HttpTransformer } from 'graphql-http-transformer';
import { PredictionsTransformer } from 'graphql-predictions-transformer';
import { KeyTransformer } from 'graphql-key-transformer';
import {
  $TSContext,
  pathManager,
  stateManager,
  CloudformationProviderFacade,
} from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import {
  loadProject,
  readTransformerConfiguration,
  TRANSFORM_CONFIG_FILE_NAME,
  ITransformer,
  TransformConfig,
} from 'graphql-transformer-core';
import importFrom from 'import-from';
import importGlobal from 'import-global';
import path from 'path';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';

const PROVIDER_NAME = 'awscloudformation';

/**
 * Scan the project config for custom transformers, then attempt to load them from the various node paths which Amplify supports.
 * @param resourceDir the directory to search for transformer configuration.
 * @returns a list of custom plugins.
 */
export const loadCustomTransformersV2 = async (resourceDir: string): Promise<TransformerPluginProvider[]> => {
  const customTransformersConfig = await loadProject(resourceDir);
  const customTransformerList = customTransformersConfig?.config?.transformers;
  return (Array.isArray(customTransformerList) ? customTransformerList : [])
    .map(importTransformerModule)
    .map((imported) => {
      const CustomTransformer = imported.default;

      if (typeof CustomTransformer === 'function') {
        return new CustomTransformer();
      } if (typeof CustomTransformer === 'object') {
        // Todo: Use a shim to ensure that it adheres to TransformerProvider interface. For now throw error
        // return CustomTransformer;
        throw new Error("Custom Transformers' should implement TransformerProvider interface");
      }

      throw new Error("Custom Transformers' default export must be a function or an object");
    })
    .filter((customTransformer) => customTransformer);
};

export const getTransformerFactoryV1 = (
  context: $TSContext,
  resourceDir: string,
  authConfig?: any,
) => async (addSearchableTransformer: boolean, storageConfig?: any) => {
  const transformerList: ITransformer[] = [
    new DynamoDBModelTransformer(),
    new VersionedModelTransformer(),
    new FunctionTransformer(),
    new HttpTransformer(),
    new KeyTransformer(),
    new ModelConnectionTransformer(),
    new PredictionsTransformer(storageConfig),
  ];

  if (addSearchableTransformer) {
    transformerList.push(new SearchableModelTransformer());
  }

  const customTransformersConfig: TransformConfig = await readTransformerConfiguration(resourceDir);
  const customTransformers = (
    customTransformersConfig && customTransformersConfig.transformers ? customTransformersConfig.transformers : []
  )
    .map(importTransformerModule)
    .map((imported) => {
      const CustomTransformer = imported.default;
      if (typeof CustomTransformer === 'function') return new CustomTransformer();
      if (typeof CustomTransformer === 'object') return CustomTransformer;
      throw new Error("Custom Transformers' default export must be a function or an object");
    })
    .filter((customTransformer) => customTransformer);

  if (customTransformers.length > 0) {
    transformerList.push(...customTransformers);
  }

  // TODO: Build dependency mechanism into transformers. Auth runs last
  // so any resolvers that need to be protected will already be created.

  let amplifyAdminEnabled = false;

  try {
    const amplifyMeta = stateManager.getMeta();
    const appId = amplifyMeta?.providers?.[PROVIDER_NAME]?.AmplifyAppId;
    const res = await CloudformationProviderFacade.isAmplifyAdminApp(context, appId);
    amplifyAdminEnabled = res.isAdminApp;
  } catch (err) {
    // if it is not an AmplifyAdmin app, do nothing
  }

  transformerList.push(new ModelAuthTransformer({ authConfig, addAwsIamAuthInOutputSchema: amplifyAdminEnabled }));
  return transformerList;
};

/**
 * Attempt to load the module from a transformer name using the following priority order
 * - modulePath is an absolute path to an NPM package
 * - modulePath is a package name, then it will be loaded from the project's root's node_modules with createRequireFromPath.
 * - modulePath is a name of a globally installed package
 */
const importTransformerModule = (transformerName: string): any => {
  const fileUrlMatch = /^file:\/\/(.*)\s*$/m.exec(transformerName);
  const modulePath = fileUrlMatch ? fileUrlMatch[1] : transformerName;

  if (!modulePath) {
    throw new Error(`Invalid value specified for transformer: '${transformerName}'`);
  }

  let importedModule;
  const tempModulePath = modulePath.toString();

  try {
    if (path.isAbsolute(tempModulePath)) {
      // Load it by absolute path
      /* eslint-disable-next-line global-require, import/no-dynamic-require */
      importedModule = require(modulePath);
    } else {
      const projectRootPath = pathManager.findProjectRoot();
      const projectNodeModules = path.join(projectRootPath, 'node_modules');

      try {
        importedModule = importFrom(projectNodeModules, modulePath);
      } catch {
        // Intentionally left blank to try global
      }

      // Try global package install
      if (!importedModule) {
        importedModule = importGlobal(modulePath);
      }
    }

    // At this point we've to have an imported module, otherwise module loader, threw an error.
    return importedModule;
  } catch (error) {
    printer.error(`Unable to import custom transformer module(${modulePath}).`);
    printer.error(`You may fix this error by editing transformers at ${path.join(transformerName, TRANSFORM_CONFIG_FILE_NAME)}`);
    throw error;
  }
};
