import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';

export const defaultTransformParameters: TransformParameters = {
  // General Params
  enableTransformerCfnOutputs: true,

  // Model Params
  shouldDeepMergeDirectiveConfigDefaults: true,
  disableResolverDeduping: false,
  sandboxModeEnabled: false,
  allowDestructiveGraphqlSchemaUpdates: false,
  replaceTableUponGsiUpdate: false,
  allowGen1Patterns: true,

  // Auth Params
  useSubUsernameForDefaultIdentityClaim: true,
  populateOwnerFieldForStaticGroupAuth: true,
  suppressApiKeyGeneration: false,
  subscriptionsInheritPrimaryAuth: false,

  // Index Params
  secondaryKeyAsGSI: true,
  enableAutoIndexQueryNames: true,

  // Relational Params
  respectPrimaryKeyAttributesOnConnectionField: true,

  // Search Params
  enableSearchNodeToNodeEncryption: false,
  enableSearchEncryptionAtRest: false,

  // Migration: only set true on a Gen1 v1->v2 migration whose deployed template
  // already carries the schema at logical ID `GraphQLSchema`. See TransformParameters.
  preserveGraphQLSchemaLogicalId: false,
};
