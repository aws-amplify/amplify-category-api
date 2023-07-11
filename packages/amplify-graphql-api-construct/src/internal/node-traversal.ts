import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Given a scope, search up for the parent stack. This should be the nearest stack object.
 * @param scope the scope to search up against.
 * @returns the stack, if one can be found, else throws an error.
 */
export const getStackForScope = (scope: Construct): Stack => {
  const stacksInHierarchy = scope.node.scopes.filter((parentScope) => 'templateOptions' in parentScope);
  if (stacksInHierarchy.length === 0) {
    throw new Error('No Stack Found in Construct Scope');
  }
  return stacksInHierarchy.reverse()[0] as Stack;
};
