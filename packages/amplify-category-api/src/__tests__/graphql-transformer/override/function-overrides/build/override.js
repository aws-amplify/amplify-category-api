function override(resource, amplifyProjectInfo) {
  resource.function.lambdaDataSource['Echofunction'].serviceRoleArn = 'mockArn';
  resource.function.lambdaDataSource['Otherfunction'].serviceRoleArn = 'mockArn';
  // override resolver
  resource.function.resolvers['queryEchoResolver'].requestMappingTemplate = 'mockTemplate';

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
