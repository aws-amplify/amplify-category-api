import { NestedStack, Stack } from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { walkAndProcessNodes } from './construct-tree';

export const GRAPHQL_API_STACK_GROUP_METADATA = 'aws-amplify:graphql-api-stack-group-root';

export const getTopLevelStack = (scope: Construct): Stack => {
  let currentStack = Stack.of(scope);

  while (currentStack.nestedStackResource && currentStack.node.scope) {
    currentStack = Stack.of(currentStack.node.scope);
  }

  return currentStack;
};

export const getGeneratedStackGroups = (scope: Construct): Stack[] => {
  const topLevelStack = getTopLevelStack(scope);
  const stackGroupScope = (topLevelStack.node.scope ?? topLevelStack.node.root) as Construct;

  return stackGroupScope.node.children.filter(
    (child): child is Stack =>
      Stack.isStack(child) &&
      child !== topLevelStack &&
      child.node.metadata.some(
        (metadataEntry) => metadataEntry.type === GRAPHQL_API_STACK_GROUP_METADATA && metadataEntry.data === scope.node.addr,
      ),
  );
};

export const walkGeneratedResourceScopes = (scope: Construct, processNode: (scope: Construct) => void): void => {
  scope.node.children.forEach((child) => walkAndProcessNodes(child, processNode));
  getGeneratedStackGroups(scope).forEach((stackGroup) => walkAndProcessNodes(stackGroup, processNode));
};

export const visitConstructTree = (scope: IConstruct, visit: (construct: IConstruct) => void): void => {
  visit(scope);
  scope.node.children.forEach((child) => visitConstructTree(child, visit));
};

export const getDirectNestedStacks = (scope: Construct): NestedStack[] => scope.node.children.filter(NestedStack.isNestedStack);
