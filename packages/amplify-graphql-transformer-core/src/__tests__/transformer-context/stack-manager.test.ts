import { NestedStackProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  STACK_MANAGER_DEFAULT_STACK_NAME_METADATA,
  StackManager,
  StackManagerOptions,
} from '../../transformer-context/stack-manager';

const createStackManager = (
  resourceMapping: Record<string, string> = {},
  options: StackManagerOptions = {},
): { stackManager: StackManager; provide: jest.Mock } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const provide = jest.fn((scope: Construct, name: string): Stack => new NestedStack(scope, name));
  const testNestedStackProvider: NestedStackProvider = {
    provide,
  };
  return { stackManager: new StackManager(stack, testNestedStackProvider, undefined, resourceMapping, options), provide };
};

const stackId = (scope: Construct): string => scope.node.id;

describe('StackManager', () => {
  it('returns the root scope when no default stack is provided', () => {
    const { stackManager } = createStackManager();

    expect(stackManager.getScopeFor('SomeResource')).toBe(stackManager.scope);
  });

  it('automatically shards resolver resources when the default stack reaches the resource budget', () => {
    const { stackManager } = createStackManager();

    for (let i = 0; i < 100; i++) {
      expect(stackId(stackManager.getScopeFor(`Field${i}Resolver`, 'ConnectionStack'))).toBe('ConnectionStack');
    }

    expect(stackId(stackManager.getScopeFor('Field100Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
    expect(stackId(stackManager.getScopeFor('Field101Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
  });

  it('automatically shards lambda data source resources when the default stack reaches the resource budget', () => {
    const { stackManager } = createStackManager();

    for (let i = 0; i < 133; i++) {
      expect(stackId(stackManager.getScopeFor(`Function${i}LambdaDataSource`, 'FunctionDirectiveStack'))).toBe('FunctionDirectiveStack');
    }

    expect(stackId(stackManager.getScopeFor('Function133LambdaDataSource', 'FunctionDirectiveStack'))).toBe('FunctionDirectiveStack2');
  });

  it('adds default-stack metadata when an existing stack becomes auto-sharded', () => {
    const { stackManager } = createStackManager();
    const stack = stackManager.createStack('FunctionDirectiveStack');

    stackManager.getScopeFor('Function0LambdaDataSource', 'FunctionDirectiveStack');

    expect(stack.node.metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: STACK_MANAGER_DEFAULT_STACK_NAME_METADATA,
          data: 'FunctionDirectiveStack',
        }),
      ]),
    );
  });

  it('keeps automatic stack assignment stable for repeated resource lookups', () => {
    const { stackManager } = createStackManager();

    for (let i = 0; i < 100; i++) {
      stackManager.getScopeFor(`Field${i}Resolver`, 'ConnectionStack');
    }

    const overflowScope = stackManager.getScopeFor('Field100Resolver', 'ConnectionStack');
    expect(stackId(overflowScope)).toBe('ConnectionStack2');

    for (let i = 0; i < 100; i++) {
      expect(stackManager.getScopeFor('Field100Resolver', 'ConnectionStack')).toBe(overflowScope);
    }

    expect(stackId(stackManager.getScopeFor('Field101Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
  });

  it('honors explicit stack mappings before automatic sharding', () => {
    const { stackManager } = createStackManager({
      Field100Resolver: 'ManuallyMappedStack',
    });

    for (let i = 0; i < 100; i++) {
      stackManager.getScopeFor(`Field${i}Resolver`, 'ConnectionStack');
    }

    expect(stackId(stackManager.getScopeFor('Field100Resolver', 'ConnectionStack'))).toBe('ManuallyMappedStack');
    expect(stackId(stackManager.getScopeFor('Field101Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
  });

  it('uses configurable stack resource budgets for automatic sharding', () => {
    const { stackManager } = createStackManager({}, { defaultStackResourceEstimateLimit: 200 });

    for (let i = 0; i < 50; i++) {
      expect(stackId(stackManager.getScopeFor(`Field${i}Resolver`, 'ConnectionStack'))).toBe('ConnectionStack');
    }

    expect(stackId(stackManager.getScopeFor('Field50Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
  });

  it('passes provider resource count overrides when creating automatic stacks', () => {
    const { stackManager, provide } = createStackManager(
      {},
      {
        stackResourceCountOverrides: {
          ConnectionStack: 900,
        },
      },
    );

    stackManager.getScopeFor('Field0Resolver', 'ConnectionStack');

    expect(provide).toHaveBeenCalledWith(stackManager.scope, 'ConnectionStack', { estimatedResourceCount: 900 });
  });
});
