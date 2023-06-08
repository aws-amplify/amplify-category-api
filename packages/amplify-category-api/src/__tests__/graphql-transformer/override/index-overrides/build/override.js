function override(resource, amplifyProjectInfo) {
  resource.models.Song.modelDatasource.dynamoDbConfig.deltaSyncConfig = {
    deltaSyncTableTtl: '15',
    baseTableTtl: '20',
    deltaSyncTableName: 'SongTable',
  };

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
