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
  allowGen1Patterns: boolean;

  // Auth Params
  useSubUsernameForDefaultIdentityClaim: boolean;
  populateOwnerFieldForStaticGroupAuth: boolean;
  suppressApiKeyGeneration: boolean;
  subscriptionsInheritPrimaryAuth: boolean;

  // Index Params
  secondaryKeyAsGSI: boolean;
  enableAutoIndexQueryNames: boolean;

  // Relational Params
  respectPrimaryKeyAttributesOnConnectionField: boolean;

  // Search Params
  enableSearchNodeToNodeEncryption: boolean;
  enableSearchEncryptionAtRest: boolean;

  /**
   * When migrating a Gen1 API from GraphQL Transformer v1 to v2, preserve the schema resource's
   * CloudFormation logical ID as the v1 value (`GraphQLSchema`) instead of the v2 CDK-generated
   * `GraphQLAPITransformerSchema<hash>`.
   *
   * The AppSync schema physical ID is deterministic (`<apiId>GraphQLSchema`, one schema per API).
   * A v1->v2 logical-ID rename therefore makes CloudFormation attempt a create-before-delete in
   * which the new and old resources resolve to the same physical ID, failing with
   * `<apiId>GraphQLSchema already exists in stack`. Pinning the logical ID keeps the migration an
   * in-place update. This MUST only be set for the v1->v2 migration of an API whose deployed
   * template still carries the schema at logical ID `GraphQLSchema`; setting it for a born-v2 API
   * would itself rename the logical ID and trigger the same collision.
   */
  preserveGraphQLSchemaLogicalId: boolean;
};
