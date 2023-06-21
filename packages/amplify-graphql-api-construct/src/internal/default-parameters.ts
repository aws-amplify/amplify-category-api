import { TransformParameters } from '../types';

/**
 * Defaults which will be used by the transformer if overrides are not provided in the construct parameters.
 */
export const defaultTransformParameters: TransformParameters = {
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
