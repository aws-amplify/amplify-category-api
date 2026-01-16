// /* eslint-disable no-console */
const { AppSyncClient, GetGraphqlApiCommand } = require('@aws-sdk/client-appsync');

const getGqlApi = async (idKey) => {
  const appsync = new AppSyncClient({ region: process.env.REGION });
  const command = new GetGraphqlApiCommand({ apiId: process.env[idKey] });
  return await appsync.send(command);
};

exports.handler = async (event) => {
  return await getGqlApi(event.idKey);
};
