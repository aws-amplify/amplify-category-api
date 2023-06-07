function override(resource, amplifyProjectInfo) {
  resource.models.Post.modelDatasource.dynamoDbConfig.deltaSyncConfig = {
    deltaSyncTableTtl: '5',
    baseTableTtl: '10',
    deltaSyncTableName: 'PostTable',
  };

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
