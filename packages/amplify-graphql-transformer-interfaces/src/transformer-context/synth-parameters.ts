export type SynthParameters = {
  amplifyEnvironmentName: string;
  apiName: string;
  authenticatedUserRoleName?: string;
  unauthenticatedUserRoleName?: string;
  userPoolId?: string;
  identityPoolId?: string;
  adminRoles?: string[];
};
