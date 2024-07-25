import { SubnetAvailabilityZone, VpcConfig } from '@aws-amplify/graphql-transformer-interfaces';
import { DescribeSubnetsCommand, DescribeSubnetsCommandInput, DescribeSubnetsCommandOutput, EC2Client } from '@aws-sdk/client-ec2';
import { DescribeDBProxiesCommand, DescribeDBProxiesCommandInput, DescribeDBProxiesCommandOutput, RDSClient } from '@aws-sdk/client-rds';
import { filterSubnetAvailabilityZones } from './filter-subnet-availability-zones';
import { DB_ENGINES } from './supported-db-engines';

// When region is not provided, it will use the region configured in the AWS profile.
export const checkHostInDBProxies = async (hostname: string, region?: string): Promise<VpcConfig | undefined> => {
  const client = new RDSClient({ region });
  const params: DescribeDBProxiesCommandInput = {
    Filters: [
      {
        Name: 'engine',
        Values: DB_ENGINES,
      },
    ],
  };

  const command = new DescribeDBProxiesCommand(params);
  const response: DescribeDBProxiesCommandOutput = await client.send(command);

  if (!response.DBProxies) {
    throw new Error('Error in fetching DB Proxies');
  }

  const proxy = response.DBProxies.find((p) => p?.Endpoint === hostname);
  if (!proxy) {
    return undefined;
  }

  const subnetAvailabilityZones = await getSubnetAvailabilityZones(proxy.VpcSubnetIds, region);

  return {
    vpcId: proxy.VpcId,
    subnetAvailabilityZoneConfig: subnetAvailabilityZones,
    securityGroupIds: proxy.VpcSecurityGroupIds,
  };
};
/**
 * Given a list of subnetIds, returns a list of `SubnetAvailabilityZone`s such that there is no more than one subnet per
 * availability zone.
 * @param subnetIds the list of subnet IDs to filter on
 * @param region the region of the VPC to which the subnets belong
 * @returns a list of `SubnetAvailabilityZone`s
 */
export const getSubnetAvailabilityZones = async (subnetIds: string[], region: string): Promise<SubnetAvailabilityZone[] | undefined> => {
  const client = new EC2Client({ region });
  const params: DescribeSubnetsCommandInput = {
    SubnetIds: subnetIds,
  };

  const response: DescribeSubnetsCommandOutput = await client.send(new DescribeSubnetsCommand(params));
  const subnetAvailabilityZones: SubnetAvailabilityZone[] = (response.Subnets ?? []).map((subnet): SubnetAvailabilityZone => {
    return {
      subnetId: subnet.SubnetId,
      availabilityZone: subnet.AvailabilityZone,
    };
  });
  return filterSubnetAvailabilityZones(subnetAvailabilityZones);
};
