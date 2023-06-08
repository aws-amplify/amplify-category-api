/**
 * ProjectOptions Type Definition
 */
import {
  AppSyncAuthConfiguration,
  FeatureFlagProvider,
  Template,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  OverrideConfig,
  ResolverConfig,
  TransformerProjectConfig,
  UserDefinedSlot,
} from '@aws-amplify/graphql-transformer-core';
import {
  DiffRule,
  ProjectRule,
} from 'graphql-transformer-core';
import { TransformerFactoryArgs } from '@aws-amplify/graphql-transformer';

/**
 * Transformer Options used to create a GraphQL Transform and compile a GQL API
 */
export type TransformerProjectOptions = {
  buildParameters: {
    S3DeploymentBucket: string;
    S3DeploymentRootKey: string;
  };
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
  userDefinedSlots: Record<string, UserDefinedSlot[]>;
  legacyApiKeyEnabled?: boolean;
  disableResolverDeduping?: boolean;
  stackMapping: Record<string, string>;
  featureFlags: FeatureFlagProvider;
};

type SanityCheckRules = {
  diffRules: DiffRule[];
  projectRules: ProjectRule[];
};
