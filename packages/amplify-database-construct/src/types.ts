import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { IDatabaseCluster } from 'aws-cdk-lib/aws-rds';

/**
 * Input props for the AmplifyDatabase construct.
 */
export interface AmplifyDatabaseProps {
  readonly vpc: IVpc;
}

export interface AmplifyDatabaseResources {
  /**
   * The database cluster created by the construct.
   */
  readonly databaseCluster: IDatabaseCluster;
}
