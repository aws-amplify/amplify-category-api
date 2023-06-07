/**
 * ProjectOptions Type Definition
 */
import {
  AppSyncAuthConfiguration,
  TransformerPluginProvider,
  Template,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  OverrideConfig,
  ResolverConfig,
  TransformerProjectConfig,
} from '@aws-amplify/graphql-transformer-core';
import {
  DiffRule,
  ProjectRule,
} from 'graphql-transformer-core';

type BuildParameters = {
  S3DeploymentBucket: string;
  S3DeploymentRootKey: string;
};

/**
 * Transformer Options used to create a GraphQL Transform and compile a GQL API
 */
export type TransformerProjectOptions = {
  buildParameters: BuildParameters;
  projectDirectory: string;
  transformersFactoryArgs: TransformerFactoryArgs;
  rootStackFileName: 'cloudformation-template.json';
  currentCloudBackendDirectory?: string;
  lastDeployedProjectConfig?: TransformerProjectConfig;
  projectConfig: TransformerProjectConfig;
  resolverConfig?: ResolverConfig;
  dryRun?: boolean;
  authConfig?: AppSyncAuthConfiguration;
  stacks: Record<string, Template>;
  sandboxModeEnabled?: boolean;
  sanityCheckRules: SanityCheckRules;
  overrideConfig: OverrideConfig;
};

type SanityCheckRules = {
  diffRules: DiffRule[];
  projectRules: ProjectRule[];
};

export type TransformerSearchConfig = {
  enableNodeToNodeEncryption?: boolean;
};

/**
 * Arguments passed into a TransformerFactory
 * Used to determine how to create a new GraphQLTransform
 */
export type TransformerFactoryArgs = {
  authConfig: any;
  storageConfig?: any;
  adminRoles?: Array<string>;
  identityPoolId?: string;
  searchConfig?: TransformerSearchConfig;
  customTransformers: TransformerPluginProvider[];
};
