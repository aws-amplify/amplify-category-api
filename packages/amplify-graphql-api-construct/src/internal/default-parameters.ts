import { SchemaTranslationBehavior } from '../types';

/**
 * Defaults which will be used by the construct if overrides are not provided.
 * These should not really be updated post-launch, since they're likely breaking changes for customers.
 * Be sure to document default values when adding new keys in the top level `types` file.
 */
export const defaultSchemaTranslationBehavior: SchemaTranslationBehavior = {
  shouldDeepMergeDirectiveConfigDefaults: true,
  disableResolverDeduping: true,
  sandboxModeEnabled: false,
  useSubUsernameForDefaultIdentityClaim: true,
  populateOwnerFieldForStaticGroupAuth: true,
  suppressApiKeyGeneration: false,
  secondaryKeyAsGSI: true,
  enableAutoIndexQueryNames: true,
  respectPrimaryKeyAttributesOnConnectionField: true,
  enableSearchNodeToNodeEncryption: false,
};
