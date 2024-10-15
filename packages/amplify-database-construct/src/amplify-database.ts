import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import {
  AuroraMysqlEngineVersion,
  AuroraPostgresEngineVersion,
  ClusterInstance,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
  IClusterEngine,
} from 'aws-cdk-lib/aws-rds';
import { InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import type { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct';
import type { AmplifyDatabaseProps, AmplifyDatabaseResources, DBType } from './types';

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
      dbType: props.dbType,
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
    return new DatabaseCluster(this, 'AmplifyDatabaseCluster', {
      engine: this.getDatabaseClusterEngine(props.dbType),
      writer: ClusterInstance.provisioned('writer', {
        instanceType: InstanceType.of(InstanceClass.R6G, InstanceSize.XLARGE4),
      }),
      enableDataApi: true,
      defaultDatabaseName: DEFAULT_DATABASE_NAME,
      vpc: props.vpc,
    });
  }

  private getDatabaseClusterEngine(dbType: DBType): IClusterEngine {
    switch (dbType) {
      // TODO: what version to use
      case 'MYSQL':
        return DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_3_07_1 });
      case 'POSTGRES':
        return DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_16_3 });
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}
