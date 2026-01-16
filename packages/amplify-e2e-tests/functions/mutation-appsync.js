/* eslint-disable no-console */
require('isomorphic-fetch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { AUTH_TYPE, AppSyncClient } = require('aws-appsync');
const gql = require('graphql-tag');

const runGQLMutation = async (gql_url, mutation, variables) => {
  // Use the default credential provider from aws-sdk v3
  const credentials = await defaultProvider()();

  const client = new AppSyncClient({
    url: process.env[gql_url],
    region: process.env.REGION,
    auth: {
      type: AUTH_TYPE.AWS_IAM,
      credentials,
    },
    disableOffline: true,
  });
  return await client.mutate({ mutation: gql(mutation), variables });
};

exports.handler = async (event) => {
  return await runGQLMutation(event.urlKey, event.mutation, event.variables);
};
