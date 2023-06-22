import { GraphqlBehavior } from '../types';

/**
 * Defaults which will be used by the construct if overrides are not provided.
 */
export const defaultGraphqlBehavior: GraphqlBehavior = {
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
};
