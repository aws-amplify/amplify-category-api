import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { IDatabaseCluster } from 'aws-cdk-lib/aws-rds';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
/**
 * Input props for the AmplifyDatabase construct.
 */
export interface AmplifyDatabaseProps {
    readonly vpc: IVpc;
    readonly dbType: DBType;
}
export interface AmplifyDatabaseResources {
    /**
     * The database cluster created by the construct.
     */
    readonly databaseCluster: IDatabaseCluster;
    /**
     * Username and password for the data API user. The Data API user is used to apply migrations and run SQL queries.
     */
    readonly dataApiSecret: ISecret;
    /**
     * Username and password for the console user. The Console user is used in the "sandbox in the cloud" for development on DB schema.
     */
    readonly consoleSecret: ISecret;
}
export type DBType = 'MYSQL' | 'POSTGRES';
