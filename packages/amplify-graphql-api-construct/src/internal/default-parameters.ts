import { SchemaTranslationBehavior } from '../types';

/**
 * Defaults which will be used by the construct if overrides are not provided.
 */
export const defaultSchemaTranslationBehavior: SchemaTranslationBehavior = {
  shouldDeepMergeDirectiveConfigDefaults: true,
  disableResolverDeduping: false,
  sandboxModeEnabled: false,
  useSubUsernameForDefaultIdentityClaim: true,
  populateOwnerFieldForStaticGroupAuth: true,
  suppressApiKeyGeneration: false,
  secondaryKeyAsGSI: true,
  enableAutoIndexQueryNames: true,
  respectPrimaryKeyAttributesOnConnectionField: true,
  enableSearchNodeToNodeEncryption: false,
  useAmplifyManagedTableResources: true,
};
