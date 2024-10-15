import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { AmplifyDatabaseProps, AmplifyDatabaseResources } from './types';
export declare class AmplifyDatabase extends Construct {
    /**
     * Generated L1 and L2 CDK resources.
     */
    readonly resources: AmplifyDatabaseResources;
    /**
     * Reference to parent stack of database construct
     */
    readonly stack: Stack;
    constructor(scope: Construct, id: string, props: AmplifyDatabaseProps);
}
