import { TranslationBehavior } from '../types';

/**
 * Defaults which will be used by the construct if overrides are not provided.
 * These should not really be updated post-launch, since they're likely breaking changes for customers.
 * Be sure to document default values when adding new keys in the top level `types` file.
 */
export const defaultTranslationBehavior: TranslationBehavior & { enableGen2Migration: boolean } = {
  shouldDeepMergeDirectiveConfigDefaults: true,
  disableResolverDeduping: true,
  sandboxModeEnabled: false,
  useSubUsernameForDefaultIdentityClaim: true,
  subscriptionsInheritPrimaryAuth: false,
  populateOwnerFieldForStaticGroupAuth: true,
  suppressApiKeyGeneration: false,
  secondaryKeyAsGSI: true,
  enableAutoIndexQueryNames: true,
  respectPrimaryKeyAttributesOnConnectionField: true,
  enableSearchNodeToNodeEncryption: false,
  enableTransformerCfnOutputs: false,
  allowDestructiveGraphqlSchemaUpdates: false,
  replaceTableUponGsiUpdate: false,
  // migrating from construct -> Gen2 is not supported
  enableGen2Migration: false,
};
