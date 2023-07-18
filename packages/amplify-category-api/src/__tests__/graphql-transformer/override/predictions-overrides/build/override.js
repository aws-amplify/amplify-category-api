function override(resource, amplifyProjectInfo) {
  resource.predictions.TranslateDataSource.serviceRoleArn = 'mockArn';
  resource.predictions.resolvers['querySpeakTranslatedLabelTextResolver'].requestMappingTemplate = 'mockTeplate';

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
