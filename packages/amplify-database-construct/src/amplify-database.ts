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
  ParameterGroup,
} from 'aws-cdk-lib/aws-rds';
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

  /**
   * Data source strategy for Amplify GraphQL API
   */
  public readonly dataSourceStrategy: SQLLambdaModelDataSourceStrategy;

  constructor(scope: Construct, id: string, props: AmplifyDatabaseProps) {
    super(scope, id);
    this.stack = Stack.of(scope);

    const dataApiSecret = this.createDatabaseSecret('dataapi');
    const consoleSecret = this.createDatabaseSecret('console');
    const databaseCluster = this.createDatabaseCluster(props);

    this.resources = {
      databaseCluster,
      dataApiSecret,
      consoleSecret,
    };

    this.dataSourceStrategy = {
      name: 'AmplifyDatabaseDataSourceStrategy',
      dbType: props.dbType,
      dbConnectionConfig: {
        // use admin secret for data source
        // admin secret will always be created because we are not overriding the credentials in DatabaseCluster
        secretArn: databaseCluster.secret!.secretArn,
        // use default port for db type
        // mysql: 3306, postgres: 5432
        port: props.dbType === 'MYSQL' ? 3306 : 5432,
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
    return new DatabaseSecret(this, `AmplifyDatabaseSecret-${username}`, {
      username,
      dbname: DEFAULT_DATABASE_NAME,
    });
  }

  private createDatabaseCluster(props: AmplifyDatabaseProps): DatabaseCluster {
    const parameterGroup = new ParameterGroup(this, 'AmplifyParameterGroup', {
      engine: this.getDatabaseClusterEngine(props.dbType),
      // TODO: add id to name
      description: 'Amplify parameter group',
      parameters:
        props.dbType === 'MYSQL'
          ? {}
          : {
              // Enable logical replication for Postgres to allow for Blue/Green deployments
              'rds.logical_replication': '1',
            },
    });
    return new DatabaseCluster(this, 'AmplifyDatabaseCluster', {
      engine: this.getDatabaseClusterEngine(props.dbType),
      writer: ClusterInstance.serverlessV2('writer'),
      enableDataApi: true,
      defaultDatabaseName: DEFAULT_DATABASE_NAME,
      vpc: props.vpc,
      parameterGroup,
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
