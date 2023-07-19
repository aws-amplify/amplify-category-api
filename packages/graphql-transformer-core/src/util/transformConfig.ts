import * as path from 'path';
import { Template } from 'cloudform-types';
import _ from 'lodash';
import { parse, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { ApiCategorySchemaNotFoundError } from '../errors';
import { throwIfNotJSONExt } from './fileUtils';
import { ProjectOptions } from './amplifyUtils';

const fs = require('fs-extra');

export const TRANSFORM_CONFIG_FILE_NAME = `transform.conf.json`;
export const TRANSFORM_BASE_VERSION = 4;
export const TRANSFORM_CURRENT_VERSION = 5;
const MODEL_DIRECTIVE_NAME = 'model';

export interface TransformMigrationConfig {
  V1?: {
    Resources: string[];
  };
}

// Sync Config
export const enum ConflictHandlerType {
  OPTIMISTIC = 'OPTIMISTIC_CONCURRENCY',
  AUTOMERGE = 'AUTOMERGE',
  LAMBDA = 'LAMBDA',
}
export type ConflictDetectionType = 'VERSION' | 'NONE';
export type SyncConfigOPTIMISTIC = {
  ConflictDetection: ConflictDetectionType;
  ConflictHandler: ConflictHandlerType.OPTIMISTIC;
};
export type SyncConfigSERVER = {
  ConflictDetection: ConflictDetectionType;
  ConflictHandler: ConflictHandlerType.AUTOMERGE;
};
export type SyncConfigLAMBDA = {
  ConflictDetection: ConflictDetectionType;
  ConflictHandler: ConflictHandlerType.LAMBDA;
  LambdaConflictHandler: {
    name: string;
    region?: string;
    lambdaArn?: any;
  };
};
export type SyncConfig = SyncConfigOPTIMISTIC | SyncConfigSERVER | SyncConfigLAMBDA;

export type ResolverConfig = {
  project?: SyncConfig;
  models?: {
    [key: string]: SyncConfig;
  };
};
/**
 * The transform config is specified in transform.conf.json within an Amplify
 * API project directory.
 */
export interface TransformConfig {
  /**
   * The transform library uses a "StackMapping" to determine which stack
   * a particular resource belongs to. This "StackMapping" allows individual
   * transformer implementations to add resources to a single context and
   * reference resources as if they were all members of the same stack. The
   * transform formatter takes the single context and the stack mapping
   * and splits the context into a valid nested stack where any Fn::Ref or Fn::GetAtt
   * is replaced by a Import/Export or Parameter. Users may provide mapping
   * overrides to get specific behavior out of the transformer. Users may
   * override the default stack mapping to customize behavior.
   */
  StackMapping?: {
    [resourceId: string]: string;
  };

  /**
   * Provide build time options to GraphQL Transformer constructor functions.
   * Certain options cannot be configured via CloudFormation parameters and
   * need to be set at build time. E.G. DeletionPolicies cannot depend on parameters.
   */
  TransformerOptions?: {
    [transformer: string]: {
      [option: string]: any;
    };
  };

  /**
   * For backwards compatibility we store a set of resource logical ids that
   * should be preserved in the top level template to prevent deleting
   * resources that holds data and that were created before the new nested stack config.
   * This should not be used moving forwards. Moving forward, use the StackMapping instead which
   * generalizes this behavior.
   */
  Migration?: TransformMigrationConfig;

  /**
   * Keeping a track of transformer version changes
   */
  Version?: number;
  /**
   * A flag added to keep a track of a change noted in elasticsearch
   */
  ElasticsearchWarning?: boolean;
  /**
   * Object which states info about a resolver's configuration
   * Such as sync configuration for appsync local support
   */
  ResolverConfig?: ResolverConfig;

  /**
   * List of custom transformer plugins
   */
  transformers?: string[];
  warningESMessage?: boolean;
}
/**
 * try to load transformer config from specified projectDir
 * if it does not exist then we return a blank object
 *  */

export async function loadConfig(projectDir: string): Promise<TransformConfig> {
  // Initialize the config always with the latest version, other members are optional for now.
  let config = {
    Version: TRANSFORM_CURRENT_VERSION,
  };
  try {
    const configPath = path.join(projectDir, TRANSFORM_CONFIG_FILE_NAME);
    const configExists = await fs.exists(configPath);
    if (configExists) {
      const configStr = await fs.readFile(configPath);
      config = JSON.parse(configStr.toString());
    }
    return config as TransformConfig;
  } catch (err) {
    return config;
  }
}

export async function writeConfig(projectDir: string, config: TransformConfig): Promise<TransformConfig> {
  const configFilePath = path.join(projectDir, TRANSFORM_CONFIG_FILE_NAME);
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 4));
  return config;
}

export const isDataStoreEnabled = async (projectDir: string): Promise<boolean> => {
  const transformerConfig = await loadConfig(projectDir);
  return transformerConfig?.ResolverConfig?.project !== undefined || transformerConfig?.ResolverConfig?.models !== undefined;
};

/**
 * Given an absolute path to an amplify project directory, load the
 * user defined configuration.
 */
interface ProjectConfiguration {
  schema: string;
  functions: {
    [k: string]: string;
  };
  pipelineFunctions: {
    [k: string]: string;
  };
  resolvers: {
    [k: string]: string;
  };
  stacks: {
    [k: string]: Template;
  };
  config: TransformConfig;
  modelToDatasourceMap: Map<string, DatasourceType>;
}
export async function loadProject(projectDirectory: string, opts?: ProjectOptions): Promise<ProjectConfiguration> {
  // Schema
  const { schema, modelToDatasourceMap } = await readSchema(projectDirectory);

  // Load functions
  const functions = {};
  if (!(opts && opts.disableFunctionOverrides === true)) {
    const functionDirectory = path.join(projectDirectory, 'functions');
    const functionDirectoryExists = await fs.exists(functionDirectory);
    if (functionDirectoryExists) {
      const functionFiles = await fs.readdir(functionDirectory);
      for (const functionFile of functionFiles) {
        if (functionFile.indexOf('.') === 0) {
          continue;
        }
        const functionFilePath = path.join(functionDirectory, functionFile);
        functions[functionFile] = functionFilePath;
      }
    }
  }

  // load pipeline functions
  const pipelineFunctions = {};
  if (!(opts && opts.disablePipelineFunctionOverrides === true)) {
    const pipelineFunctionDirectory = path.join(projectDirectory, 'pipelineFunctions');
    const pipelineFunctionDirectoryExists = await fs.exists(pipelineFunctionDirectory);
    if (pipelineFunctionDirectoryExists) {
      const pipelineFunctionFiles = await fs.readdir(pipelineFunctionDirectory);
      for (const pipelineFunctionFile of pipelineFunctionFiles) {
        if (pipelineFunctionFile.indexOf('.') === 0) {
          continue;
        }
        const pipelineFunctionPath = path.join(pipelineFunctionDirectory, pipelineFunctionFile);
        pipelineFunctions[pipelineFunctionFile] = await fs.readFile(pipelineFunctionPath, 'utf8');
      }
    }
  }

  // Load the resolvers
  const resolvers = {};
  if (!(opts && opts.disableResolverOverrides === true)) {
    const resolverDirectory = path.join(projectDirectory, 'resolvers');
    const resolverDirExists = await fs.exists(resolverDirectory);
    if (resolverDirExists) {
      const resolverFiles = await fs.readdir(resolverDirectory);
      for (const resolverFile of resolverFiles) {
        if (resolverFile.indexOf('.') === 0) {
          continue;
        }
        const resolverFilePath = path.join(resolverDirectory, resolverFile);
        resolvers[resolverFile] = await fs.readFile(resolverFilePath, 'utf8');
      }
    }
  }

  // Load Stacks
  const stacksDirectory = path.join(projectDirectory, 'stacks');
  const stacksDirExists = await fs.exists(stacksDirectory);
  const stacks = {};
  if (stacksDirExists) {
    const stackFiles = await fs.readdir(stacksDirectory);
    for (const stackFile of stackFiles) {
      if (stackFile.indexOf('.') === 0) {
        continue;
      }

      const stackFilePath = path.join(stacksDirectory, stackFile);
      throwIfNotJSONExt(stackFile);
      const stackBuffer = await fs.readFile(stackFilePath);
      try {
        stacks[stackFile] = JSON.parse(stackBuffer.toString());
      } catch (e) {
        throw new Error(`The CloudFormation template ${stackFiles} does not contain valid JSON.`);
      }
    }
  }

  const config = await loadConfig(projectDirectory);
  return {
    functions,
    pipelineFunctions,
    stacks,
    resolvers,
    schema,
    config,
    modelToDatasourceMap,
  };
}

/**
 * Given a project directory read the schema from disk. The schema may be a
 * single schema.graphql or a set of .graphql files in a directory named `schema`.
 * Preference is given to the `schema.graphql` if provided.
 * @param projectDirectory The project directory.
 */
export async function readSchema(projectDirectory: string): Promise<{ schema: string; modelToDatasourceMap: Map<string, DatasourceType> }> {
  let modelToDatasourceMap = new Map<string, DatasourceType>();
  const schemaFilePaths = [path.join(projectDirectory, 'schema.graphql'), path.join(projectDirectory, 'schema.rds.graphql')];

  const existingSchemaFiles = schemaFilePaths.filter((path) => fs.existsSync(path));
  const schemaDirectoryPath = path.join(projectDirectory, 'schema');

  let schema = '';
  if (!_.isEmpty(existingSchemaFiles)) {
    // Schema.graphql contains the models for DynamoDB datasource
    // Schema.rds.graphql contains the models for imported 'MySQL' datasource
    // Intentionally using 'for ... of ...' instead of 'object.foreach' to process this in sequence
    for (const file of existingSchemaFiles) {
      const datasourceType = file.endsWith('.rds.graphql') ? constructDataSourceType('MySQL', false) : constructDataSourceType('DDB');
      const fileSchema = (await fs.readFile(file)).toString();
      modelToDatasourceMap = new Map([...modelToDatasourceMap.entries(), ...constructDataSourceMap(fileSchema, datasourceType).entries()]);
      schema += fileSchema;
    }
  } else if (fs.existsSync(schemaDirectoryPath)) {
    // Schema folder is used only for DynamoDB datasource
    const datasourceType = constructDataSourceType('DDB');
    const schemaInDirectory = (await readSchemaDocuments(schemaDirectoryPath)).join('\n');
    modelToDatasourceMap = new Map([
      ...modelToDatasourceMap.entries(),
      ...constructDataSourceMap(schemaInDirectory, datasourceType).entries(),
    ]);
    schema += schemaInDirectory;
  } else {
    throw new ApiCategorySchemaNotFoundError(schemaFilePaths[0]);
  }
  return {
    schema,
    modelToDatasourceMap,
  };
}

async function readSchemaDocuments(schemaDirectoryPath: string): Promise<string[]> {
  const files = await fs.readdir(schemaDirectoryPath);
  let schemaDocuments = [];
  for (const fileName of files) {
    if (fileName.indexOf('.') === 0) {
      continue;
    }

    const fullPath = `${schemaDirectoryPath}/${fileName}`;
    const stats = await fs.lstat(fullPath);
    if (stats.isDirectory()) {
      const childDocs = await readSchemaDocuments(fullPath);
      schemaDocuments = schemaDocuments.concat(childDocs);
    } else if (stats.isFile()) {
      const schemaDoc = await fs.readFile(fullPath);
      schemaDocuments.push(schemaDoc);
    }
  }
  return schemaDocuments;
}

export type DBType = 'MySQL' | 'DDB';

export interface DatasourceType {
  dbType: DBType;
  provisionDB: boolean;
}

function constructDataSourceType(dbType: DBType, provisionDB: boolean = true): DatasourceType {
  return {
    dbType,
    provisionDB,
  };
}

function constructDataSourceMap(schema: string, datasourceType: DatasourceType): Map<string, DatasourceType> {
  const parsedSchema = parse(schema);
  const result = new Map<string, DatasourceType>();
  parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives.some((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .forEach((type) => {
      result.set((type as ObjectTypeDefinitionNode).name.value, datasourceType);
    });
  return result;
}
