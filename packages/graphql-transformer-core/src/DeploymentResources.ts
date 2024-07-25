export interface Template {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Metadata?: Record<string, any>;
  Parameters?: Record<string, any>;
  Mappings?: {
    [key: string]: {
      [key: string]: Record<string, string | number | string[]>;
    };
  };
  Conditions?: Record<string, any>;
  Transform?: any;
  Resources?: Record<string, any>;
  Outputs?: Record<string, any>;
}

export interface StackMapping {
  [resourceId: string]: string;
}

export interface ResolversFunctionsAndSchema {
  // Resolver templates keyed by their filename.
  resolvers: Record<string, string>;
  // Contains mapping templates for pipeline functions.
  pipelineFunctions: Record<string, string>;
  // Code for any functions that need to be deployed.
  functions: Record<string, string>;
  // The full GraphQL schema.
  schema: string;
  // List of the user overridden slots
  userOverriddenSlots: string[];
}

export interface NestedStacks {
  // The root stack template.
  rootStack: Template;
  // All the nested stack templates.
  stacks: Record<string, Template>;
  // The full stack mapping for the deployment.
  stackMapping: StackMapping;
}

/**
 * The full set of resources needed for the deployment.
 */
export interface DeploymentResources extends ResolversFunctionsAndSchema, NestedStacks {}
