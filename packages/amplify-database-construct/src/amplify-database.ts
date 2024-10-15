import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { AmplifyDatabaseProps } from './types';

export class AmplifyDatabase extends Construct {
  /**
   * Reference to parent stack of database construct
   */
  public readonly stack: Stack;

  constructor(scope: Construct, id: string, props: AmplifyDatabaseProps) {
    super(scope, id);
    this.stack = Stack.of(scope);
    console.log(props);
  }
}
