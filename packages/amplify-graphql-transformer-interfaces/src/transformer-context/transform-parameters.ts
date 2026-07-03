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

  // SQL Params
  /**
   * Opt-in optimization for RDS-in-VPC SQL APIs. When enabled, the SQL Lambda's VPC is provisioned with only the `ssm` interface VPC
   * endpoint (the sole endpoint consumed at runtime to read the database connection secret). When disabled (the default), the full set of
   * endpoints (`ssm`, `ssmmessages`, `ec2`, `ec2messages`, `kms`) is provisioned, preserving the existing behavior.
   */
  minimizeRdsVpcEndpoints: boolean;

  // Search Params
  enableSearchNodeToNodeEncryption: boolean;
  enableSearchEncryptionAtRest: boolean;
};
