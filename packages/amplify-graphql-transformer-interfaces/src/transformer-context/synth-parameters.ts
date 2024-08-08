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
  namespace: string;
  name: string;
}

export interface BranchDeploymentIdentifier {
  deploymentType: 'branch';
  namespace: string;
  name: string;
}

export type DeploymentIdentifier = SandboxDeploymentIdentifier | BranchDeploymentIdentifier | undefined;
