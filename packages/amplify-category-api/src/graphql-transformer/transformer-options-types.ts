/**
 * ProjectOptions Type Definition
 */
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverConfig, UserDefinedSlot } from '@aws-amplify/graphql-transformer-core';
import { DiffRule, ProjectRule } from 'graphql-transformer-core';
import { TransformerFactoryArgs } from '@aws-amplify/graphql-transformer';
import { Template } from './cdk-compat/deployment-resources';
import { TransformerProjectConfig } from './cdk-compat/project-config';
import { OverrideConfig } from './cdk-compat/transform-manager';

/**
 * Transformer Options used to create a GraphQL Transform and compile a GQL API
 */
export type TransformerProjectOptions = {
  resourceName: string;
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
  migrate?: boolean;
};

type SanityCheckRules = {
  diffRules: DiffRule[];
  projectRules: ProjectRule[];
};
