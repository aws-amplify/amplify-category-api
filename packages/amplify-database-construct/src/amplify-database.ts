import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { DatabaseCluster, AuroraMysqlEngineVersion, DatabaseClusterEngine, ClusterInstance, DatabaseSecret } from 'aws-cdk-lib/aws-rds';
import { InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import type { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct';
import { AmplifyDatabaseProps, AmplifyDatabaseResources } from './types';

const DEFAULT_DATABASE_NAME = 'amplify';

export class AmplifyDatabase extends Construct {
  /**
   * Reference to parent stack of database construct
   */
  public readonly stack: Stack;

  /**
   * Generated L1 and L2 CDK resources.
   */
  public readonly resources: AmplifyDatabaseResources;

  public readonly dataSourceStrategy: SQLLambdaModelDataSourceStrategy;

  constructor(scope: Construct, id: string, props: AmplifyDatabaseProps) {
    super(scope, id);
    this.stack = Stack.of(scope);

    // TODO: pass secrets to database cluster
    const dataApiSecret = this.createDatabaseSecret('dataapi');
    const consoleSecret = this.createDatabaseSecret('console');
    const databaseCluster = this.createDatabaseCluster(props);

    this.resources = {
      databaseCluster,
      dataApiSecret,
      consoleSecret,
    };

    if (!databaseCluster.secret) {
      throw new Error('Database cluster does not have an admin secret.');
    }
    this.dataSourceStrategy = {
      name: 'AmplifyDatabaseDataSourceStrategy',
      // TODO: set same as cluster
      dbType: 'MYSQL',
      dbConnectionConfig: {
        // use admin secret
        secretArn: databaseCluster.secret.secretArn,
        // TODO: get correct port
        port: 5000,
        databaseName: DEFAULT_DATABASE_NAME,
        hostname: databaseCluster.clusterEndpoint.hostname,
      },
      vpcConfiguration: {
        vpcId: databaseCluster.vpc.vpcId,
        // TODO: how to fix this
        // @ts-expect-error protected property
        securityGroupIds: databaseCluster.securityGroups.map((securityGroup) => securityGroup.securityGroupId),
        subnetAvailabilityZoneConfig: databaseCluster.vpc.publicSubnets,
      },
    };
  }

  private createDatabaseSecret(username: string): DatabaseSecret {
    // TODO: is this ok with BGDs?
    // should it be with SecretsManager directly?
    return new DatabaseSecret(this, `AmplifyDatabaseSecret-${username}`, {
      username,
    });
  }

  private createDatabaseCluster(props: AmplifyDatabaseProps): DatabaseCluster {
    // TODO: set config
    return new DatabaseCluster(this, 'AmplifyDatabaseCluster', {
      engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_3_01_0 }),
      writer: ClusterInstance.provisioned('writer', {
        instanceType: InstanceType.of(InstanceClass.R6G, InstanceSize.XLARGE4),
      }),
      serverlessV2MinCapacity: 6.5,
      serverlessV2MaxCapacity: 64,
      readers: [
        // will be put in promotion tier 1 and will scale with the writer
        ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true }),
        // will be put in promotion tier 2 and will not scale with the writer
        ClusterInstance.serverlessV2('reader2'),
      ],
      defaultDatabaseName: DEFAULT_DATABASE_NAME,
      vpc: props.vpc,
    });
  }
}
