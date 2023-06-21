function override(resource, amplifyProjectInfo) {
  resource.models.Test.modelDatasource.dynamoDbConfig.deltaSyncConfig = {
    deltaSyncTableTtl: "25",
    baseTableTtl: "20",
    deltaSyncTableName: "TestTable"
  };

  if (amplifyProjectInfo.envName != "testEnvName") {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != "testProjectName") {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
