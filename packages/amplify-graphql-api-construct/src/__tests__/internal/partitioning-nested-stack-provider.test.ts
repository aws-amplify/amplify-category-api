import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PartitioningNestedStackProvider } from '../../internal';

describe('PartitioningNestedStackProvider', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let provider: PartitioningNestedStackProvider;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    provider = new PartitioningNestedStackProvider(stack);
  });

  describe('resource categorization', () => {
    test('categorizes API resources as PRIMARY', () => {
      const apiStack = provider.provide(stack, 'GraphQLApi');
      const schemaStack = provider.provide(stack, 'GraphQLSchema');
      const apiKeyStack = provider.provide(stack, 'APIKey');

      expect(apiStack).toBeDefined();
      expect(schemaStack).toBe(apiStack); // Same stack
      expect(apiKeyStack).toBe(apiStack); // Same stack
    });

    test('categorizes table resources as PRIMARY', () => {
      const apiStack = provider.provide(stack, 'GraphQLApi');
      const tableStack = provider.provide(stack, 'TodoTable');
      const dynamoStack = provider.provide(stack, 'DynamoDBTable');

      expect(tableStack).toBe(apiStack); // Same primary stack
      expect(dynamoStack).toBe(apiStack); // Same primary stack
    });

    test('categorizes data source resources as PRIMARY', () => {
      const apiStack = provider.provide(stack, 'GraphQLApi');
      const dsStack = provider.provide(stack, 'TodoTableDataSource');
      const lambdaDsStack = provider.provide(stack, 'LambdaDataSource');
      const httpDsStack = provider.provide(stack, 'HttpDataSource');

      expect(dsStack).toBe(apiStack); // Same primary stack
      expect(lambdaDsStack).toBe(apiStack); // Same primary stack
      expect(httpDsStack).toBe(apiStack); // Same primary stack
    });

    test('categorizes resolver resources as RESOLVERS', () => {
      const apiStack = provider.provide(stack, 'GraphQLApi');
      const resolverStack = provider.provide(stack, 'QueryGetTodoResolver');

      expect(resolverStack).toBeDefined();
      expect(resolverStack).not.toBe(apiStack); // Different stack
    });

    test('categorizes function resources as RESOLVERS', () => {
      const apiStack = provider.provide(stack, 'GraphQLApi');
      const functionStack = provider.provide(stack, 'GetTodoFunction');

      expect(functionStack).toBeDefined();
      expect(functionStack).not.toBe(apiStack); // Different stack
    });
  });

  describe('resolver distribution', () => {
    test('places first resolver in resolvers-0 stack', () => {
      provider.provide(stack, 'GraphQLApi'); // Create primary
      const resolver1Stack = provider.provide(stack, 'QueryGetTodoResolver');
      const resolver2Stack = provider.provide(stack, 'QueryListTodosResolver');

      expect(resolver1Stack).toBe(resolver2Stack); // Same resolver stack
    });

    test('creates overflow stack when resolver limit reached', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 2,
      });

      customProvider.provide(stack, 'GraphQLApi'); // Primary
      const resolver1Stack = customProvider.provide(stack, 'Resolver1');
      const resolver2Stack = customProvider.provide(stack, 'Resolver2');
      const resolver3Stack = customProvider.provide(stack, 'Resolver3'); // Should overflow

      expect(resolver1Stack).toBe(resolver2Stack);
      expect(resolver3Stack).not.toBe(resolver1Stack); // Different stack
    });

    test('groups related resolvers by GraphQL type', () => {
      provider.provide(stack, 'GraphQLApi'); // Primary
      const queryStack1 = provider.provide(stack, 'QueryGetTodoResolver');
      const queryStack2 = provider.provide(stack, 'QueryListTodosResolver');
      const mutationStack = provider.provide(stack, 'MutationCreateTodoResolver');

      expect(queryStack1).toBe(queryStack2); // Same stack (grouped by Query type)
      expect(mutationStack).toBe(queryStack1); // Same stack (not full yet)
    });

    test('respects groupRelatedResolvers config', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        groupRelatedResolvers: false,
        maxResolversPerStack: 1,
      });

      customProvider.provide(stack, 'GraphQLApi');
      const resolver1 = customProvider.provide(stack, 'QueryGetTodoResolver');
      const resolver2 = customProvider.provide(stack, 'QueryListTodosResolver');

      // With grouping disabled and max=1, should create separate stacks
      expect(resolver1).not.toBe(resolver2);
    });
  });

  describe('capacity management', () => {
    test('respects maxResolversPerStack configuration', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 3,
      });

      customProvider.provide(stack, 'GraphQLApi');
      const stack1 = customProvider.provide(stack, 'Resolver1');
      customProvider.provide(stack, 'Resolver2');
      customProvider.provide(stack, 'Resolver3');
      const stack2 = customProvider.provide(stack, 'Resolver4'); // Should overflow

      expect(stack2).not.toBe(stack1);
    });

    test('respects stackSizeThreshold configuration', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        stackSizeThreshold: 6000, // 2 resolvers (2 * 3000 bytes)
      });

      customProvider.provide(stack, 'GraphQLApi');
      const stack1 = customProvider.provide(stack, 'Resolver1');
      customProvider.provide(stack, 'Resolver2');
      const stack2 = customProvider.provide(stack, 'Resolver3'); // Should overflow

      expect(stack2).not.toBe(stack1);
    });

    test('tracks resource count per stack', () => {
      provider.provide(stack, 'GraphQLApi');
      provider.provide(stack, 'TodoTable');
      provider.provide(stack, 'TodoTableDataSource');

      const stats = provider.getStats();
      expect(stats.primaryStackResources).toBe(3);
    });
  });

  describe('statistics', () => {
    test('returns basic statistics for single stack', () => {
      provider.provide(stack, 'GraphQLApi');
      provider.provide(stack, 'QueryGetTodoResolver');

      const stats = provider.getStats();

      expect(stats.totalStacks).toBe(2); // Primary + Resolvers0
      expect(stats.resolverStacks).toBe(1);
      expect(stats.totalResolvers).toBe(1);
      expect(stats.avgResolversPerStack).toBe(1);
      expect(stats.warnings).toEqual([]);
    });

    test('returns statistics for multiple resolver stacks', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 2,
      });

      customProvider.provide(stack, 'GraphQLApi');
      customProvider.provide(stack, 'Resolver1');
      customProvider.provide(stack, 'Resolver2');
      customProvider.provide(stack, 'Resolver3');
      customProvider.provide(stack, 'Resolver4');

      const stats = customProvider.getStats();

      expect(stats.totalStacks).toBe(3); // Primary + 2 resolver stacks
      expect(stats.resolverStacks).toBe(2);
      expect(stats.totalResolvers).toBe(4);
      expect(stats.avgResolversPerStack).toBe(2);
    });

    test('includes warnings when approaching resource limit', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 500, // Will trigger resource count warning
      });

      customProvider.provide(stack, 'GraphQLApi');
      // Simulate adding many resources to primary stack
      for (let i = 0; i < 455; i++) {
        customProvider.provide(stack, `Table${i}`);
      }

      const stats = customProvider.getStats();

      expect(stats.warnings.length).toBeGreaterThan(0);
      expect(stats.warnings[0]).toContain('near resource limit');
    });
  });

  describe('limit validation', () => {
    test('throws error when resource limit exceeded', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 600, // Will exceed resource limit
      });

      customProvider.provide(stack, 'GraphQLApi');
      // Add resources to exceed 500 resource limit
      for (let i = 0; i < 502; i++) {
        customProvider.provide(stack, `Table${i}`);
      }

      expect(() => {
        customProvider.getStats();
      }).toThrow(/exceeds CloudFormation resource limit/);
    });

    test('does not throw for stacks under limits', () => {
      provider.provide(stack, 'GraphQLApi');
      for (let i = 0; i < 100; i++) {
        provider.provide(stack, `Resolver${i}`);
      }

      expect(() => {
        provider.getStats();
      }).not.toThrow();
    });
  });

  describe('stack naming', () => {
    test('names primary stack correctly', () => {
      const primaryStack = provider.provide(stack, 'GraphQLApi');
      expect(primaryStack.node.id).toBe('DataPrimary');
    });

    test('names resolver stacks with incrementing index', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 1,
      });

      customProvider.provide(stack, 'GraphQLApi');
      const stack0 = customProvider.provide(stack, 'Resolver1');
      const stack1 = customProvider.provide(stack, 'Resolver2');
      const stack2 = customProvider.provide(stack, 'Resolver3');

      expect(stack0.node.id).toBe('DataResolvers0');
      expect(stack1.node.id).toBe('DataResolvers1');
      expect(stack2.node.id).toBe('DataResolvers2');
    });
  });

  describe('GraphQL type extraction', () => {
    test('extracts type from Query resolvers', () => {
      provider.provide(stack, 'GraphQLApi');
      const stack1 = provider.provide(stack, 'QueryGetTodoResolver');
      const stack2 = provider.provide(stack, 'QueryListTodosResolver');

      // Both Query resolvers should be grouped together
      expect(stack1).toBe(stack2);
    });

    test('extracts type from Mutation resolvers', () => {
      provider.provide(stack, 'GraphQLApi');
      const stack1 = provider.provide(stack, 'MutationCreateTodoResolver');
      const stack2 = provider.provide(stack, 'MutationUpdateTodoResolver');

      // Both Mutation resolvers should be grouped together
      expect(stack1).toBe(stack2);
    });

    test('extracts type from Subscription resolvers', () => {
      provider.provide(stack, 'GraphQLApi');
      const stack1 = provider.provide(stack, 'SubscriptionOnCreateTodoResolver');
      const stack2 = provider.provide(stack, 'SubscriptionOnUpdateTodoResolver');

      // Both Subscription resolvers should be grouped together
      expect(stack1).toBe(stack2);
    });

    test('handles custom type resolvers', () => {
      provider.provide(stack, 'GraphQLApi');
      const stack1 = provider.provide(stack, 'TodoListResolver');
      const stack2 = provider.provide(stack, 'TodoItemResolver');

      // Custom Todo type resolvers should be grouped
      expect(stack1).toBe(stack2);
    });
  });

  describe('configuration defaults', () => {
    test('uses default configuration when not specified', () => {
      const defaultProvider = new PartitioningNestedStackProvider(stack);

      defaultProvider.provide(stack, 'GraphQLApi');
      // Add 200 resolvers (default limit)
      for (let i = 0; i < 200; i++) {
        defaultProvider.provide(stack, `Resolver${i}`);
      }
      defaultProvider.provide(stack, 'Resolver201');

      const stats = defaultProvider.getStats();
      expect(stats.resolverStacks).toBeGreaterThan(1); // Should have overflowed
    });

    test('applies custom configuration correctly', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        stackSizeThreshold: 600000,
        maxResolversPerStack: 150,
        groupRelatedResolvers: false,
        maxCrossStackReferences: 100,
      });

      customProvider.provide(stack, 'GraphQLApi');
      for (let i = 0; i < 150; i++) {
        customProvider.provide(stack, `Resolver${i}`);
      }
      customProvider.provide(stack, 'Resolver151');

      const stats = customProvider.getStats();
      expect(stats.resolverStacks).toBeGreaterThan(1); // Should overflow at 150
    });
  });

  describe('edge cases', () => {
    test('handles empty schema with no resolvers', () => {
      provider.provide(stack, 'GraphQLApi');

      const stats = provider.getStats();
      expect(stats.totalStacks).toBe(1); // Only primary
      expect(stats.resolverStacks).toBe(0);
      expect(stats.totalResolvers).toBe(0);
    });

    test('handles single resolver', () => {
      provider.provide(stack, 'GraphQLApi');
      provider.provide(stack, 'QueryGetTodoResolver');

      const stats = provider.getStats();
      expect(stats.totalStacks).toBe(2);
      expect(stats.resolverStacks).toBe(1);
      expect(stats.totalResolvers).toBe(1);
    });

    test('handles very large number of resolvers', () => {
      const customProvider = new PartitioningNestedStackProvider(stack, {
        maxResolversPerStack: 100,
      });

      customProvider.provide(stack, 'GraphQLApi');
      // Add 1000 resolvers
      for (let i = 0; i < 1000; i++) {
        customProvider.provide(stack, `Resolver${i}`);
      }

      const stats = customProvider.getStats();
      expect(stats.resolverStacks).toBe(10); // 1000 / 100 = 10 stacks
      expect(stats.totalResolvers).toBe(1000);
    });

    test('handles resources with no category match', () => {
      const otherStack = provider.provide(stack, 'SomeUnknownResource');

      expect(otherStack).toBeDefined();
      expect(otherStack.node.id).toBe('DataOther');
    });
  });
});
