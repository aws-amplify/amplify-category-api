import { SubnetAvailabilityZone, VpcConfig } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DescribeDBClustersCommand,
  DescribeDBClustersCommandInput,
  DescribeDBClustersCommandOutput,
  DescribeDBSubnetGroupsCommand,
  RDSClient,
} from '@aws-sdk/client-rds';
import { filterSubnetAvailabilityZones } from './filter-subnet-availability-zones';
import { DB_ENGINES } from './supported-db-engines';

// When region is not provided, it will use the region configured in the AWS profile.
export const checkHostInDBClusters = async (hostname: string, region?: string): Promise<VpcConfig | undefined> => {
  const client = new RDSClient({ region });
  const params: DescribeDBClustersCommandInput = {
    Filters: [
      {
        Name: 'engine',
        Values: DB_ENGINES,
      },
    ],
  };

  const command = new DescribeDBClustersCommand(params);
  const response: DescribeDBClustersCommandOutput = await client.send(command);

  if (!response.DBClusters) {
    throw new Error('Error in fetching DB Clusters');
  }

  const cluster = response.DBClusters.find((dbCluster) => dbCluster?.Endpoint === hostname);
  if (!cluster) {
    return undefined;
  }

  const { subnetAvailabilityZoneConfig, vpcId } = await getSubnetAvailabilityZonesFromSubnetGroup(cluster.DBSubnetGroup, region);

  const securityGroupIds = cluster.VpcSecurityGroups.map((securityGroup) => securityGroup.VpcSecurityGroupId);
  return {
    vpcId,
    subnetAvailabilityZoneConfig,
    securityGroupIds,
  };
};
const getSubnetAvailabilityZonesFromSubnetGroup = async (
  subnetGroupName: string,
  region: string,
): Promise<Pick<VpcConfig, 'subnetAvailabilityZoneConfig' | 'vpcId'>> => {
  const client = new RDSClient({ region });
  const command = new DescribeDBSubnetGroupsCommand({
    DBSubnetGroupName: subnetGroupName,
  });
  const response = await client.send(command);
  const subnetGroup = response.DBSubnetGroups?.find((sg) => sg?.DBSubnetGroupName === subnetGroupName);

  if (!subnetGroup) {
    throw new Error(`DB Subnet Group ${subnetGroupName} not found in region ${region}`);
  }

  const subnetAvailabilityZones = subnetGroup?.Subnets.map((subnet): SubnetAvailabilityZone => {
    return {
      subnetId: subnet.SubnetIdentifier,
      availabilityZone: subnet.SubnetAvailabilityZone?.Name,
    };
  });

  const filteredSubnetAvailabilityZones = filterSubnetAvailabilityZones(subnetAvailabilityZones);
  return {
    vpcId: subnetGroup.VpcId,
    subnetAvailabilityZoneConfig: filteredSubnetAvailabilityZones,
  };
};
