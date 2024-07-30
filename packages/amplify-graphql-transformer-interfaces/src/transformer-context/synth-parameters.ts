export type SynthParameters = {
  amplifyEnvironmentName: string;
  apiName: string;
  authenticatedUserRoleName?: string;
  unauthenticatedUserRoleName?: string;
  userPoolId?: string;
  identityPoolId?: string;
  adminRoles?: string[];
  enableIamAccess?: boolean;
  deploymentIdentifier?: DeploymentIdentifier;
};

export interface SandboxDeploymentIdentifier {
  deploymentType: 'sandbox';
  deploymentId: string;
}

export interface BranchDeploymentIdentifier {
  deploymentType: 'branch';
  branchName: string;
  branchId: string;
}

export type DeploymentIdentifier = SandboxDeploymentIdentifier | BranchDeploymentIdentifier;
