import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { DatabaseCluster, AuroraMysqlEngineVersion, DatabaseClusterEngine, ClusterInstance } from 'aws-cdk-lib/aws-rds';
import { AmplifyDatabaseProps, AmplifyDatabaseResources } from './types';

export class AmplifyDatabase extends Construct {
  /**
   * Generated L1 and L2 CDK resources.
   */
  public readonly resources: AmplifyDatabaseResources;

  /**
   * Reference to parent stack of database construct
   */
  public readonly stack: Stack;

  constructor(scope: Construct, id: string, props: AmplifyDatabaseProps) {
    super(scope, id);
    this.stack = Stack.of(scope);

    // TODO: set config
    const databaseCluster = new DatabaseCluster(this, 'Database', {
      engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_3_01_0 }),
      writer: ClusterInstance.provisioned('writer', {
        // instanceType: InstanceType.of(InstanceClass.R6G, InstanceSize.XLARGE4),
      }),
      serverlessV2MinCapacity: 6.5,
      serverlessV2MaxCapacity: 64,
      readers: [
        // will be put in promotion tier 1 and will scale with the writer
        ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true }),
        // will be put in promotion tier 2 and will not scale with the writer
        ClusterInstance.serverlessV2('reader2'),
      ],
      vpc: props.vpc,
    });

    this.resources = {
      databaseCluster: databaseCluster,
    };
  }
}
