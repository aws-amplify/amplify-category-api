/**
 * ProjectOptions Type Definition
 */
import { AppSyncAuthConfiguration, Template } from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverConfig, TransformerProjectConfig, UserDefinedSlot } from '@aws-amplify/graphql-transformer-core';
import { DiffRule, ProjectRule } from 'graphql-transformer-core';
import { TransformerFactoryArgs } from '@aws-amplify/graphql-transformer';
import { OverrideConfig } from './amplify-api-resource-stack-types';

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
  sanityCheckRules: SanityCheckRules;
  overrideConfig: OverrideConfig;
  userDefinedSlots: Record<string, UserDefinedSlot[]>;
  stackMapping: Record<string, string>;
  transformParameters: TransformParameters;
};

type SanityCheckRules = {
  diffRules: DiffRule[];
  projectRules: ProjectRule[];
};
