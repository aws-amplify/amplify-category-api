import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';

export const defaultTransformParameters: TransformParameters = {
  // General Model Params
  shouldDeepMergeDirectiveConfigDefaults: true,

  // Auth Params
  useSubUsernameForDefaultIdentityClaim: true,
  populateOwnerFieldForStaticGroupAuth: true,

  // Index Params
  secondaryKeyAsGSI: true,
  enableAutoIndexQueryNames: true,

  // Relational Params
  respectPrimaryKeyAttributesOnConnectionField: true,
};
