/**
 * Strongly typed set of shared parameters for all transformers, and core layer.
 * This is intended to replace feature flags, to ensure param coercion happens in
 * a single location, and isn't spread around the transformers, where they can
 * have different default behaviors.
 */
export type TransformParameters = {
  // General Model Params
  shouldDeepMergeDirectiveConfigDefaults: boolean;

  // Auth Params
  useSubUsernameForDefaultIdentityClaim: boolean;
  populateOwnerFieldForStaticGroupAuth: boolean;

  // Index Params
  secondaryKeyAsGSI: boolean;
  enableAutoIndexQueryNames: boolean;

  // Relational Params
  respectPrimaryKeyAttributesOnConnectionField: boolean;
};
