import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

export const findRootStack = (scope: Construct): Stack => {
  const rootStack = scope.node.scopes.find(Stack.isStack);
  if (!rootStack) {
    throw new Error('Nested stacks must be defined within scope of another non-nested stack');
  }
  return rootStack;
};
