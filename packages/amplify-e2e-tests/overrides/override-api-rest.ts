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
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != '##EXPECTED_PROJECT_NAME') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
