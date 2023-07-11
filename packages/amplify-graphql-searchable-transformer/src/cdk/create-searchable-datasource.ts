import { GraphQLAPIProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { BaseDataSource } from 'aws-cdk-lib/aws-appsync';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { ResourceConstants } from 'graphql-transformer-common';
import { Stack } from 'aws-cdk-lib';
import { IDomain } from 'aws-cdk-lib/aws-elasticsearch';

export const createSearchableDataSource = (
  stack: Stack,
  graphqlApiProvider: GraphQLAPIProvider,
  domain: IDomain,
  role: IRole,
): BaseDataSource => {
  const { OpenSearchDataSourceLogicalID } = ResourceConstants.RESOURCES;
  return graphqlApiProvider.host.addElasticSearchDataSource(
    OpenSearchDataSourceLogicalID,
    domain,
    {
      serviceRole: role,
      name: OpenSearchDataSourceLogicalID,
    },
    stack,
  );
};
