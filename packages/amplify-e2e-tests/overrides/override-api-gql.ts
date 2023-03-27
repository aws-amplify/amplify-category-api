export function override(resource: any, amplifyProjectInfo: any): any {
  resource.api.GraphQLAPI.xrayEnabled = true;

  if (!amplifyProjectInfo || !amplifyProjectInfo.envName || !amplifyProjectInfo.projectName) {
    throw new Error(`Project info is missing in override: ${JSON.stringify(amplifyProjectInfo)}`);
  }

  if (amplifyProjectInfo.envName != '##EXPECTED_ENV_NAME') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != '##EXPECTED_PROJECT_NAME') {
    throw new Error(`Unexpected projectName: ${amplifyProjectInfo.projectName}`);
  }
}
