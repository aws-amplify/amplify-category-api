import { SubnetAvailabilityZone, VpcConfig } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DescribeDBInstancesCommand,
  DescribeDBInstancesCommandInput,
  DescribeDBInstancesCommandOutput,
  RDSClient,
} from '@aws-sdk/client-rds';
import { filterSubnetAvailabilityZones } from './filter-subnet-availability-zones';
import { DB_ENGINES } from './supported-db-engines';

// When region is not provided, it will use the region configured in the AWS profile.
export const checkHostInDBInstances = async (hostname: string, region?: string): Promise<VpcConfig | undefined> => {
  const client = new RDSClient({ region });
  const params: DescribeDBInstancesCommandInput = {
    Filters: [
      {
        Name: 'engine',
        Values: DB_ENGINES,
      },
    ],
  };

  const command = new DescribeDBInstancesCommand(params);
  const response: DescribeDBInstancesCommandOutput = await client.send(command);

  if (!response.DBInstances) {
    throw new Error('Error in fetching DB Instances');
  }

  const instance = response.DBInstances.find((dbInstance) => dbInstance?.Endpoint?.Address === hostname);
  if (!instance) {
    return undefined;
  }

  const subnetAvailabilityZones = instance?.DBSubnetGroup.Subnets.map((subnet): SubnetAvailabilityZone => {
    return {
      subnetId: subnet.SubnetIdentifier,
      availabilityZone: subnet.SubnetAvailabilityZone?.Name,
    };
  });

  const subnetAvailabilityZoneConfig = filterSubnetAvailabilityZones(subnetAvailabilityZones);

  const vpcId = instance.DBSubnetGroup.VpcId;
  const securityGroupIds = instance.VpcSecurityGroups.map((securityGroup) => securityGroup.VpcSecurityGroupId);
  return {
    vpcId,
    subnetAvailabilityZoneConfig,
    securityGroupIds,
  };
};
