function override(resource, amplifyProjectInfo) {
  resource.api.GraphQLAPI.xrayEnabled = true;
  resource.models['Post'].modelDDBTable.billingMode = 'PROVISIONED';
  resource.models['Comment'].modelDDBTable.billingMode = 'PROVISIONED';
  // override resolver
  resource.models['Post'].resolvers['subscriptionOnUpdatePostResolver'].requestMappingTemplate = 'mockTemplate';

  if (amplifyProjectInfo.envName != 'testEnvName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }

  if (amplifyProjectInfo.projectName != 'testProjectName') {
    throw new Error(`Unexpected envName: ${amplifyProjectInfo.envName}`);
  }
}
exports.override = override;
