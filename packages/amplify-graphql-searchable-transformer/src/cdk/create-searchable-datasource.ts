import { GraphQLAPIProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { BaseDataSource } from 'aws-cdk-lib/aws-appsync';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { ResourceConstants } from 'graphql-transformer-common';
import { Stack } from 'aws-cdk-lib';

export const createSearchableDataSource = (
  stack: Stack,
  graphqlApiProvider: GraphQLAPIProvider,
  domainEndpoint: string,
  role: IRole,
  region: string,
): BaseDataSource => {
  const { OpenSearchDataSourceLogicalID } = ResourceConstants.RESOURCES;
  const dsEndpoint = `https://${domainEndpoint}`;
  return graphqlApiProvider.host.addSearchableDataSource(
    OpenSearchDataSourceLogicalID,
    region,
    dsEndpoint,
    {
      serviceRole: role,
      name: OpenSearchDataSourceLogicalID,
    },
    stack,
  );
};
