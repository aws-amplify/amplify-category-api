/**
 * Strongly typed set of shared parameters for all transformers, and core layer.
 * This is intended to replace feature flags, to ensure param coercion happens in
 * a single location, and isn't spread around the transformers, where they can
 * have different default behaviors.
 */
export type TransformParameters = {
  // General Params
  enableTransformerCfnOutputs: boolean;

  // Model Params
  shouldDeepMergeDirectiveConfigDefaults: boolean;
  disableResolverDeduping: boolean;
  sandboxModeEnabled: boolean;
  allowDestructiveGraphqlSchemaUpdates: boolean;
  replaceTableUponGsiUpdate: boolean;

  // Auth Params
  useSubUsernameForDefaultIdentityClaim: boolean;
  populateOwnerFieldForStaticGroupAuth: boolean;
  suppressApiKeyGeneration: boolean;

  // Index Params
  secondaryKeyAsGSI: boolean;
  enableAutoIndexQueryNames: boolean;

  // Relational Params
  respectPrimaryKeyAttributesOnConnectionField: boolean;

  // Search Params
  enableSearchNodeToNodeEncryption: boolean;
};
