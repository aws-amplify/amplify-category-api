import {
  RDSClient,
  DescribeDBClustersCommandOutput,
  DescribeDBInstancesCommandOutput,
  DescribeDBProxiesCommandOutput,
  DescribeDBSubnetGroupsCommandOutput,
} from '@aws-sdk/client-rds';

import { getHostVpc } from '../vpc-helper';

const sendSpy = jest.spyOn(RDSClient.prototype, 'send');

const vpcId = 'vpc-aaaaaaaaaaaaaaaaa';
const subnetIds = ['subnet-1111111111', 'subnet-2222222222'];
const securityGroupIds = ['sg-abc123'];

describe('detect VPC settings', () => {
  it('should detect VPC settings for an RDS instance after checking proxy and cluster', async () => {
    // TS complains about resolving values in the spy.
    // Cast it through never to overcome the compile error.
    sendSpy
      .mockResolvedValueOnce(emptyProxyResponse as never)
      .mockResolvedValueOnce(clusterResponse as never)
      .mockResolvedValueOnce(instanceResponse as never)
      .mockRejectedValue('Should not make any other calls' as never);

    const result = await getHostVpc('mock-rds-cluster-instance-1.aaaaaaaaaaaa.us-west-2.rds.amazonaws.com', 'us-west-2');

    expect(result).toBeDefined();
    expect(result?.vpcId).toEqual(vpcId);
    expect(result?.subnetIds).toEqual(expect.arrayContaining(subnetIds));
    expect(result?.subnetIds.length).toEqual(subnetIds.length);
    expect(result?.securityGroupIds).toEqual(expect.arrayContaining(securityGroupIds));
    expect(result?.securityGroupIds.length).toEqual(securityGroupIds.length);
  });

  it('should detect VPC settings for an RDS cluster after checking proxy', async () => {
    // Note that the cluster response doesn't include subnet information,
    // so it requires an additional call.
    // TS complains about resolving values in the spy.
    // Cast it through never to overcome the compile error.
    sendSpy
      .mockResolvedValueOnce(emptyProxyResponse as never)
      .mockResolvedValueOnce(clusterResponse as never)
      .mockResolvedValueOnce(subnetResponse as never)
      .mockRejectedValue('Should not make any other calls' as never);

    const result = await getHostVpc('mock-rds-cluster.cluster-abc123.us-west-2.rds.amazonaws.com', 'us-west-2');

    expect(result).toBeDefined();
    expect(result?.vpcId).toEqual(vpcId);
    expect(result?.subnetIds).toEqual(expect.arrayContaining(subnetIds));
    expect(result?.subnetIds.length).toEqual(subnetIds.length);
    expect(result?.securityGroupIds).toEqual(expect.arrayContaining(securityGroupIds));
    expect(result?.securityGroupIds.length).toEqual(securityGroupIds.length);
  });

  it('should detect VPC settings for an RDS proxy', async () => {
    // TS complains about resolving values in the spy.
    // Cast it through never to overcome the compile error.
    sendSpy.mockResolvedValueOnce(proxyResponse as never).mockRejectedValue('Should not make any other calls' as never);

    const result = await getHostVpc('mock-rds-cluster.proxy-abc123.us-west-2.rds.amazonaws.com', 'us-west-2');

    expect(result).toBeDefined();
    expect(result?.vpcId).toEqual(vpcId);
    expect(result?.subnetIds).toEqual(expect.arrayContaining(subnetIds));
    expect(result?.subnetIds.length).toEqual(subnetIds.length);
    expect(result?.securityGroupIds).toEqual(expect.arrayContaining(securityGroupIds));
    expect(result?.securityGroupIds.length).toEqual(securityGroupIds.length);
  });

  it('should return undefined for non-matching hosts', async () => {
    // TS complains about resolving values in the spy.
    // Cast it through never to overcome the compile error.
    sendSpy
      .mockResolvedValueOnce(emptyProxyResponse as never)
      .mockResolvedValueOnce(clusterResponse as never)
      .mockResolvedValueOnce(instanceResponse as never)
      .mockRejectedValue('Should not make any other calls' as never);

    const result = await getHostVpc('nonexistent-host.cluster-abc123.us-west-2.rds.amazonaws.com', 'us-west-2');

    expect(result).toBeUndefined();
  });
});

const instanceResponse: DescribeDBInstancesCommandOutput = {
  $metadata: {},
  DBInstances: [
    {
      DBInstanceIdentifier: 'mock-rds-cluster-instance-1',
      DBInstanceClass: 'db.serverless',
      Engine: 'aurora-mysql',
      DBInstanceStatus: 'available',
      MasterUsername: 'admin',
      Endpoint: {
        Address: 'mock-rds-cluster-instance-1.aaaaaaaaaaaa.us-west-2.rds.amazonaws.com',
        Port: 3306,
        HostedZoneId: 'Z1AAAAAAAAAAAA',
      },
      AllocatedStorage: 1,
      InstanceCreateTime: new Date(),
      PreferredBackupWindow: '09:08-09:38',
      BackupRetentionPeriod: 1,
      DBSecurityGroups: [],
      VpcSecurityGroups: [
        {
          VpcSecurityGroupId: securityGroupIds[0],
          Status: 'active',
        },
      ],
      DBParameterGroups: [
        {
          DBParameterGroupName: 'default.aurora-mysql8.0',
          ParameterApplyStatus: 'in-sync',
        },
      ],
      AvailabilityZone: 'us-west-2b',
      DBSubnetGroup: {
        DBSubnetGroupName: 'default-vpc-abc123',
        DBSubnetGroupDescription: 'Created from the RDS Management Console',
        VpcId: vpcId,
        SubnetGroupStatus: 'Complete',
        Subnets: [
          {
            SubnetIdentifier: subnetIds[0],
            SubnetAvailabilityZone: {
              Name: 'us-west-2b',
            },
            SubnetOutpost: {},
            SubnetStatus: 'Active',
          },
          {
            SubnetIdentifier: subnetIds[1],
            SubnetAvailabilityZone: {
              Name: 'us-west-2b',
            },
            SubnetOutpost: {},
            SubnetStatus: 'Active',
          },
        ],
      },
      PreferredMaintenanceWindow: 'sat:06:40-sat:07:10',
      PendingModifiedValues: {},
      MultiAZ: false,
      EngineVersion: '8.0.mysql_aurora.3.04.0',
      AutoMinorVersionUpgrade: true,
      ReadReplicaDBInstanceIdentifiers: [],
      LicenseModel: 'general-public-license',
      OptionGroupMemberships: [
        {
          OptionGroupName: 'default:aurora-mysql-8-0',
          Status: 'in-sync',
        },
      ],
      PubliclyAccessible: true,
      StorageType: 'aurora',
      DbInstancePort: 0,
      DBClusterIdentifier: 'mock-rds-cluster',
      StorageEncrypted: true,
      KmsKeyId: 'arn:aws:kms:us-west-2:123456789012:key/11112222-3333-4444-aaaa-bbbbbbbbbbbb',
      DbiResourceId: 'db-IDAAAAAAAAAAAAAAAAAAAAAAAA',
      CACertificateIdentifier: 'rds-ca-2019',
      DomainMemberships: [],
      CopyTagsToSnapshot: false,
      MonitoringInterval: 60,
      EnhancedMonitoringResourceArn: 'arn:aws:logs:us-west-2:123456789012:log-group:RDSOSMetrics:log-stream:db-IDAAAAAAAAAAAAAAAAAAAAAAAA',
      MonitoringRoleArn: 'arn:aws:iam::123456789012:role/rds-monitoring-role',
      PromotionTier: 1,
      DBInstanceArn: 'arn:aws:rds:us-west-2:123456789012:db:mock-rds-cluster-instance-1',
      IAMDatabaseAuthenticationEnabled: false,
      PerformanceInsightsEnabled: true,
      PerformanceInsightsKMSKeyId: 'arn:aws:kms:us-west-2:123456789012:key/11112222-3333-4444-aaaa-bbbbbbbbbbbb',
      PerformanceInsightsRetentionPeriod: 7,
      DeletionProtection: false,
      AssociatedRoles: [],
      TagList: [],
      CustomerOwnedIpEnabled: false,
      BackupTarget: 'region',
      NetworkType: 'IPV4',
    },
  ],
};

const clusterResponse: DescribeDBClustersCommandOutput = {
  $metadata: {},
  DBClusters: [
    {
      AllocatedStorage: 1,
      AvailabilityZones: ['us-west-2c', 'us-west-2b', 'us-west-2a'],
      BackupRetentionPeriod: 1,
      DBClusterIdentifier: 'mock-rds-cluster',
      DBClusterParameterGroup: 'default.aurora-mysql8.0',
      DBSubnetGroup: 'default-vpc-abc123',
      Status: 'available',
      EarliestRestorableTime: new Date(),
      Endpoint: 'mock-rds-cluster.cluster-abc123.us-west-2.rds.amazonaws.com',
      ReaderEndpoint: 'mock-rds-cluster.cluster.cluster-ro-abc123.us-west-2.rds.amazonaws.com',
      MultiAZ: false,
      Engine: 'aurora-mysql',
      EngineVersion: '8.0.mysql_aurora.3.04.0',
      LatestRestorableTime: new Date(),
      Port: 3306,
      MasterUsername: 'admin',
      PreferredBackupWindow: '09:08-09:38',
      PreferredMaintenanceWindow: 'thu:06:19-thu:06:49',
      ReadReplicaIdentifiers: [],
      DBClusterMembers: [
        {
          DBInstanceIdentifier: 'mock-rds-cluster-instance-1',
          IsClusterWriter: true,
          DBClusterParameterGroupStatus: 'in-sync',
          PromotionTier: 1,
        },
      ],
      VpcSecurityGroups: [
        {
          VpcSecurityGroupId: securityGroupIds[0],
          Status: 'active',
        },
      ],
      HostedZoneId: 'Z1AAAA0A000A0A',
      StorageEncrypted: true,
      KmsKeyId: 'arn:aws:kms:us-west-2:123456789012:key/11112222-3333-4444-aaaa-bbbbbbbbbbbb',
      DbClusterResourceId: 'cluster-00AAAAAAAAAAAAAAAAAAAAAAAA',
      DBClusterArn: 'arn:aws:rds:us-west-2:123456789012:cluster:mock-rds-cluster',
      AssociatedRoles: [],
      IAMDatabaseAuthenticationEnabled: false,
      ClusterCreateTime: new Date(),
      EngineMode: 'provisioned',
      DeletionProtection: true,
      HttpEndpointEnabled: false,
      ActivityStreamStatus: 'stopped',
      CopyTagsToSnapshot: true,
      CrossAccountClone: false,
      DomainMemberships: [],
      TagList: [],
      AutoMinorVersionUpgrade: true,
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 8,
        MaxCapacity: 64,
      },
      NetworkType: 'IPV4',
    },
  ],
};

const emptyProxyResponse: DescribeDBProxiesCommandOutput = { $metadata: {}, DBProxies: [] };

const proxyResponse: DescribeDBProxiesCommandOutput = {
  $metadata: {},
  DBProxies: [
    {
      DBProxyName: 'mockproxy',
      DBProxyArn: 'arn:aws:rds:us-west-2:123456789012:db-proxy:prx-00001111222233334',
      Status: 'available',
      EngineFamily: 'MYSQL',
      VpcId: vpcId,
      VpcSecurityGroupIds: securityGroupIds,
      VpcSubnetIds: subnetIds,
      Auth: [
        {
          AuthScheme: 'SECRETS',
          SecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:ProxyClusterSecret-AAAAAAAAAAAA-aaaaaa',
          IAMAuth: 'DISABLED',
        },
      ],
      RoleArn: 'arn:aws:iam::123456789012:role/Stack-ClusterProxyRole-1111111111111',
      Endpoint: 'mock-rds-cluster.proxy-abc123.us-west-2.rds.amazonaws.com',
      RequireTLS: true,
      IdleClientTimeout: 1800,
      DebugLogging: false,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
    },
  ],
};

const subnetResponse: DescribeDBSubnetGroupsCommandOutput = {
  $metadata: {},
  DBSubnetGroups: [
    {
      DBSubnetGroupName: 'default-vpc-abc123',
      DBSubnetGroupDescription: 'Created from the RDS Management Console',
      VpcId: vpcId,
      SubnetGroupStatus: 'Complete',
      Subnets: [
        {
          SubnetIdentifier: subnetIds[0],
          SubnetAvailabilityZone: {
            Name: 'us-west-2b',
          },
          SubnetOutpost: {},
          SubnetStatus: 'Active',
        },
        {
          SubnetIdentifier: subnetIds[1],
          SubnetAvailabilityZone: {
            Name: 'us-west-2b',
          },
          SubnetOutpost: {},
          SubnetStatus: 'Active',
        },
      ],
      DBSubnetGroupArn: 'arn:aws:rds:us-west-2:123456789012:subgrp:default-vpc-abc123',
      SupportedNetworkTypes: ['IPV4'],
    },
  ],
};
