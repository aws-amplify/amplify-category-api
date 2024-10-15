import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import type { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct';
import { AmplifyDatabaseProps, AmplifyDatabaseResources } from './types';
export declare class AmplifyDatabase extends Construct {
    /**
     * Reference to parent stack of database construct
     */
    readonly stack: Stack;
    /**
     * Generated L1 and L2 CDK resources.
     */
    readonly resources: AmplifyDatabaseResources;
    readonly dataSourceStrategy: SQLLambdaModelDataSourceStrategy;
    constructor(scope: Construct, id: string, props: AmplifyDatabaseProps);
    private createDatabaseSecret;
    private createDatabaseCluster;
}
