import { NestedStackProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackManager } from '../../transformer-context/stack-manager';

const testNestedStackProvider: NestedStackProvider = {
  provide: (scope: Construct, name: string): Stack => new NestedStack(scope, name),
};

const createStackManager = (resourceMapping: Record<string, string> = {}): StackManager => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  return new StackManager(stack, testNestedStackProvider, undefined, resourceMapping);
};

const stackId = (scope: Construct): string => scope.node.id;

describe('StackManager', () => {
  it('returns the root scope when no default stack is provided', () => {
    const stackManager = createStackManager();

    expect(stackManager.getScopeFor('SomeResource')).toBe(stackManager.scope);
  });

  it('automatically shards resolver resources when the default stack reaches the resource budget', () => {
    const stackManager = createStackManager();

    for (let i = 0; i < 100; i++) {
      expect(stackId(stackManager.getScopeFor(`Field${i}Resolver`, 'ConnectionStack'))).toBe('ConnectionStack');
    }

    expect(stackId(stackManager.getScopeFor('Field100Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
    expect(stackId(stackManager.getScopeFor('Field101Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
  });

  it('automatically shards lambda data source resources when the default stack reaches the resource budget', () => {
    const stackManager = createStackManager();

    for (let i = 0; i < 133; i++) {
      expect(stackId(stackManager.getScopeFor(`Function${i}LambdaDataSource`, 'FunctionDirectiveStack'))).toBe('FunctionDirectiveStack');
    }

    expect(stackId(stackManager.getScopeFor('Function133LambdaDataSource', 'FunctionDirectiveStack'))).toBe('FunctionDirectiveStack2');
  });

  it('keeps automatic stack assignment stable for repeated resource lookups', () => {
    const stackManager = createStackManager();

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
    const stackManager = createStackManager({
      Field100Resolver: 'ManuallyMappedStack',
    });

    for (let i = 0; i < 100; i++) {
      stackManager.getScopeFor(`Field${i}Resolver`, 'ConnectionStack');
    }

    expect(stackId(stackManager.getScopeFor('Field100Resolver', 'ConnectionStack'))).toBe('ManuallyMappedStack');
    expect(stackId(stackManager.getScopeFor('Field101Resolver', 'ConnectionStack'))).toBe('ConnectionStack2');
  });
});
