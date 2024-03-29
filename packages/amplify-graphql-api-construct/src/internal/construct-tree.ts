import { Construct } from 'constructs';

/**
 * Utility to iteratively walk the construct tree starting at a particular node, executing a node processor at each step.
 * @param currentScope the scope to process.
 * @param processNode the fn to invoke on walk.
 */
export const walkAndProcessNodes = (currentScope: Construct, processNode: (scope: Construct) => void): void => {
  processNode(currentScope);
  currentScope.node.children.forEach((child) => walkAndProcessNodes(child, processNode));
};
