export function override(resources: any, amplifyProjectInfo: any) {
  const desc = {
    'Fn::Join': [' ', ['Description', 'override', 'successful']],
  };

  resources.addCfnParameter(
    {
      type: 'String',
      description: 'Test parameter',
    },
    'DESCRIPTION',
    desc,
  );

  resources.restApi.description = { Ref: 'DESCRIPTION' };

  if (!amplifyProjectInfo || !amplifyProjectInfo.envName || !amplifyProjectInfo.projectName) {
    throw new Error(`Project info is missing in override: ${JSON.stringify(amplifyProjectInfo)}`);
  }

  if (amplifyProjectInfo.envName != '##EXPECTED_ENV_NAME') {
    throw new Error(`Received unexpected envName: ${amplifyProjectInfo.envName}. Expected ##EXPECTED_ENV_NAME. ${JSON.stringify(amplifyProjectInfo)}`);
  }

  if (amplifyProjectInfo.projectName != '##EXPECTED_PROJECT_NAME') {
    throw new Error(`Received unexpected projectName: ${amplifyProjectInfo.projectName}. Expected ##EXPECTED_PROJECT_NAME. ${JSON.stringify(amplifyProjectInfo)}`);
  }
}
