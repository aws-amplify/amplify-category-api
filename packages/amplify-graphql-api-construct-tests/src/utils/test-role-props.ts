/**
 * Specifies values for creating an IAM role to be used in tests.
 */
export interface TestRoleProps {
  /**
   * An array of principals that can assume the test role
   */
  assumeRolePrincipals: AssumeRolePrincipal[];
}

/**
 * An AWS account ID that will be allowed to assume the test role
 */
export interface AccountAssumeRolePrincipal {
  account: string;
}

/**
 * A Role ARNs that will be allowed to assume the test role
 */
export interface RoleArnAssumeRolePrincipal {
  /** The ARN of the role to be granted `sts:AssumeRole` permissions on the test role */
  roleArn: string;

  /** The ID to be assigned to the role when it is imported into the test stack */
  id: string;
}

export type AssumeRolePrincipal = AccountAssumeRolePrincipal | RoleArnAssumeRolePrincipal;
