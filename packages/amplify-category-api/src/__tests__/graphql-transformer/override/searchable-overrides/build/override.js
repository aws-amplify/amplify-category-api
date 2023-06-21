function override(resource, amplifyProjectInfo) {
  resource.opensearch.OpenSearchDomain.encryptionAtRestOptions = {
    enabled: true,
    kmsKeyId: '1a2a3a4-1a2a-3a4a-5a6a-1a2a3a4a5a6a',
  };
  resource.opensearch.OpenSearchDataSource.serviceRoleArn = 'mockArn';
  resource.opensearch.OpenSearchModelLambdaMapping['Post'].functionName = 'mockFunciton';
  // override resolver
  resource.opensearch.resolvers['querySearchPostsResolver'].requestMappingTemplate = 'mockTemplate';

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;