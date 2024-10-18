/**
 * Specifies values for creating an IAM role to be used in tests.
 */
export interface TestRoleProps {
  /**
   * The AWS account that will be allowed to assume the role
   */
  assumedByAccount: string;
}
