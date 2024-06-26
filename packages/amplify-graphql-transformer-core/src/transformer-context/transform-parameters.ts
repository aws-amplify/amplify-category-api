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
  allowRequiredRelationalFields: false,

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
};
