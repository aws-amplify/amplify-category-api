import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('automatic nested stack partitioning', () => {
  describe('with partitioning disabled', () => {
    it('creates single nested stack for small schema', () => {
      const stack = new cdk.Stack();

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: false,
      });

      const template = Template.fromStack(stack);

      // Should have single nested stack
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacks).length).toBe(1);
    });
  });

  describe('with partitioning enabled', () => {
    it('creates primary stack for API and tables', () => {
      const stack = new cdk.Stack();

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
      });

      const template = Template.fromStack(stack);

      // Should have at least 2 nested stacks (primary + resolvers)
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacks).length).toBeGreaterThanOrEqual(2);

      // Check for DataPrimary stack
      const stackIds = Object.keys(nestedStacks);
      expect(stackIds.some((id) => id.includes('DataPrimary'))).toBe(true);
    });

    it('creates multiple resolver stacks for large schema', () => {
      const stack = new cdk.Stack();

      // Generate a large schema with many types
      const types = Array.from({ length: 50 }, (_, i) => `
        type Model${i} @model @auth(rules: [{ allow: public, provider: apiKey }]) {
          name: String!
          description: String
        }
      `).join('\n');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ types),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          maxResolversPerStack: 50, // Force multiple stacks
        },
      });

      const template = Template.fromStack(stack);

      // Should have multiple nested stacks
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacks).length).toBeGreaterThan(2);

      // Check for resolver stacks
      const stackIds = Object.keys(nestedStacks);
      expect(stackIds.some((id) => id.includes('DataResolvers'))).toBe(true);
    });

    it('respects custom partitioning configuration', () => {
      const stack = new cdk.Stack();

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
          type Note @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          stackSizeThreshold: 600000,
          maxResolversPerStack: 150,
          groupRelatedResolvers: true,
        },
      });

      const template = Template.fromStack(stack);

      // Should successfully create stacks with custom config
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacks).length).toBeGreaterThanOrEqual(2);
    });

    it('enables via CDK context', () => {
      const app = new cdk.App({
        context: {
          'amplify-data-auto-partition': true,
        },
      });
      const stack = new cdk.Stack(app, 'TestStack');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        // Not setting enableAutoPartitioning - should read from context
      });

      const template = Template.fromStack(stack);

      // Should have multiple stacks (partitioning enabled via context)
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacks).length).toBeGreaterThanOrEqual(2);
    });

    it('keeps tables and data sources in primary stack', () => {
      const stack = new cdk.Stack();

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
      });

      const template = Template.fromStack(stack);

      // GraphQL API should be created
      template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);

      // DynamoDB table should be created
      template.resourceCountIs('AWS::DynamoDB::Table', 1);

      // Data sources should be created
      const dataSources = template.findResources('AWS::AppSync::DataSource');
      expect(Object.keys(dataSources).length).toBeGreaterThan(0);
    });
  });

  describe('backwards compatibility', () => {
    it('maintains same behavior as single stack when partitioning disabled', () => {
      const stackWithPartitioning = new cdk.Stack();
      const stackWithoutPartitioning = new cdk.Stack();

      const definition = AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
          content: String!
        }
      `);

      const authModes = {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      };

      new AmplifyGraphqlApi(stackWithPartitioning, 'TestApi', {
        definition,
        authorizationModes: authModes,
        enableAutoPartitioning: false,
      });

      new AmplifyGraphqlApi(stackWithoutPartitioning, 'TestApi', {
        definition,
        authorizationModes: authModes,
        // Not specifying enableAutoPartitioning (defaults to false in construct)
      });

      const templateWith = Template.fromStack(stackWithPartitioning);
      const templateWithout = Template.fromStack(stackWithoutPartitioning);

      // Should have same number of nested stacks
      const nestedStacksWith = templateWith.findResources('AWS::CloudFormation::Stack');
      const nestedStacksWithout = templateWithout.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacksWith).length).toBe(Object.keys(nestedStacksWithout).length);
    });

    it('preserves API ID and URLs when partitioning enabled', () => {
      const stack = new cdk.Stack();

      const api = new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
      });

      // API should expose standard properties
      expect(api.apiId).toBeDefined();
      expect(api.graphqlUrl).toBeDefined();
      expect(api.realtimeUrl).toBeDefined();

      const template = Template.fromStack(stack);

      // GraphQL API resource should exist
      template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    });
  });

  describe('edge cases', () => {
    it('handles schema with no models', () => {
      const stack = new cdk.Stack();

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Query {
            hello: String
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
      });

      const template = Template.fromStack(stack);

      // Should still create API successfully
      template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    });

    it('handles schema with custom queries and mutations', () => {
      const stack = new cdk.Stack();

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
            content: String!
          }

          type Query {
            customQuery: String @function(name: "myFunction")
          }

          type Mutation {
            customMutation(input: String): String @function(name: "myFunction")
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
      });

      const template = Template.fromStack(stack);

      // Should create all resources successfully
      template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    });

    it('handles very large schema with many types', () => {
      const stack = new cdk.Stack();

      // Generate 100 types
      const types = Array.from({ length: 100 }, (_, i) => `
        type Model${i} @model @auth(rules: [{ allow: public, provider: apiKey }]) {
          field1: String!
          field2: Int
          field3: Boolean
        }
      `).join('\n');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ types),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          maxResolversPerStack: 100,
        },
      });

      const template = Template.fromStack(stack);

      // Should create multiple stacks successfully
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      expect(Object.keys(nestedStacks).length).toBeGreaterThan(2);

      // API should still be created
      template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    });
  });

  describe('configuration validation', () => {
    it('accepts valid partitioning config', () => {
      const stack = new cdk.Stack();

      expect(() => {
        new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
              content: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
          enableAutoPartitioning: true,
          partitioningConfig: {
            stackSizeThreshold: 500000,
            maxResolversPerStack: 100,
            groupRelatedResolvers: false,
            maxCrossStackReferences: 100,
          },
        });
      }).not.toThrow();
    });

    it('works with partial partitioning config', () => {
      const stack = new cdk.Stack();

      expect(() => {
        new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
              content: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
          enableAutoPartitioning: true,
          partitioningConfig: {
            maxResolversPerStack: 150,
          },
        });
      }).not.toThrow();
    });
  });
});
