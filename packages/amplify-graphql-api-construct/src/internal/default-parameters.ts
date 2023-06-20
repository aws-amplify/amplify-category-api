import { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * Defaults which will be used by the transformer if overrides are not provided in the construct parameters.
 */
export const defaultTransformParameters: TransformParameters = {
  /**
   * Restore parity w/ GQLv1 @model parameter behavior, where setting a single field doesn't implicitly set the other fields to null.
   */
  shouldDeepMergeDirectiveConfigDefaults: true,

  /**
   * Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same
   * id to access data from a deleted user in the pool.
   */
  useSubUsernameForDefaultIdentityClaim: true,

  /**
   * Ensure that the owner field is still populated even if a static iam or group authorization applies.
   */
  populateOwnerFieldForStaticGroupAuth: true,

  /**
   * If disabled, generated @index as an LSI instead of a GSI.
   */
  secondaryKeyAsGSI: true,

  /**
   * Automate generation of query names, and as a result attaching all indexes as queries to the generated API.
   * If enabled, @index can be provided a null name field to disable the generation of the query on the api.
   */
  enableAutoIndexQueryNames: true,

  /**
   * Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.
   */
  respectPrimaryKeyAttributesOnConnectionField: true,
};
