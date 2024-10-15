import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { AmplifyDatabaseProps } from './types';
export declare class AmplifyDatabase extends Construct {
    /**
     * Reference to parent stack of database construct
     */
    readonly stack: Stack;
    constructor(scope: Construct, id: string, props: AmplifyDatabaseProps);
}
