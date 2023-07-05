function override(resource, amplifyProjectInfo) {
  resource.http.httpsDataSource['httpwwwapicom'].serviceRoleArn = 'mockArn';
  resource.http.httpsDataSource['httpwwwapicom'].httpConfig = {
    endpoint: 'mockEndpoint',
  };
  resource.http.httpsDataSource['httpapicom'].serviceRoleArn = 'mockArn';
  resource.http.httpsDataSource['httpapicom'].httpConfig = {
    endpoint: 'mockEndpoint',
  };
  resource.http.httpsDataSource['httpwwwgooglecom'].serviceRoleArn = 'mockArn';
  resource.http.httpsDataSource['httpwwwgooglecom'].httpConfig = {
    endpoint: 'mockEndpoint',
  };
  resource.http.httpsDataSource['httpswwwapicom'].serviceRoleArn = 'mockArn';
  resource.http.httpsDataSource['httpswwwapicom'].httpConfig = {
    endpoint: 'mockEndpoint',
  };
  // override resolver
  resource.http.resolvers['commentContentResolver'].requestMappingTemplate = 'mockTemplate';

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
