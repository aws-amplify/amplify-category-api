import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';

export const defaultTransformParameters: TransformParameters = {
  // General Model Params
  shouldDeepMergeDirectiveConfigDefaults: true,
  disableResolverDeduping: false,
  sandboxModeEnabled: false,

  // Auth Params
  useSubUsernameForDefaultIdentityClaim: true,
  populateOwnerFieldForStaticGroupAuth: true,
  suppressApiKeyGeneration: false,

  // Index Params
  secondaryKeyAsGSI: true,
  enableAutoIndexQueryNames: true,

  // Relational Params
  respectPrimaryKeyAttributesOnConnectionField: true,

  // Search Params
  enableSearchNodeToNodeEncryption: false,
};
