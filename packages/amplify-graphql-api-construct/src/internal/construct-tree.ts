import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Given a scope, search up for the parent stack. This should be the nearest stack object.
 * @param scope the scope to search up against.
 * @returns the stack, if one can be found, else throws an error.
 */
export const getStackForScope = (scope: Construct, getRootStack = false): Stack => {
  const stacksInHierarchy = scope.node.scopes.filter((parentScope) => 'templateOptions' in parentScope);
  if (stacksInHierarchy.length === 0) {
    throw new Error('No Stack Found in Construct Scope');
  }
  const stacks = getRootStack ? stacksInHierarchy : stacksInHierarchy.reverse();
  return stacks[0] as Stack;
};

/**
 * Utility to iteratively walk the construct tree starting at a particular node, executing a node processor at each step.
 * @param currentScope the scope to process.
 * @param processNode the fn to invoke on walk.
 */
export const walkAndProcessNodes = (currentScope: Construct, processNode: (scope: Construct) => void): void => {
  processNode(currentScope);
  currentScope.node.children.forEach((child) => walkAndProcessNodes(child, processNode));
};
