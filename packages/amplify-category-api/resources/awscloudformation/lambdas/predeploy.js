const { CodePipeline } = require('@aws-sdk/client-codepipeline');
const { ECS } = require('@aws-sdk/client-ecs');

const codepipeline = new CodePipeline();
const ecs = new ECS();

const { DESIRED_COUNT: desiredCountStr, CLUSTER_NAME: cluster, SERVICE_NAME: service } = process.env;

const desiredCount = parseInt(desiredCountStr, 10);

exports.handler = async function({ 'CodePipeline.job': { id: jobId } }) {
  await ecs.updateService({
    service,
    cluster,
    desiredCount,
  });

  return await codepipeline.putJobSuccessResult({ jobId });
};
