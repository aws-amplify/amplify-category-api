import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse, print } from 'graphql';
import { ConversationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GenerationTransformer } from '@aws-amplify/graphql-generation-transformer';

const conversationSchemaTypes = fs.readFileSync(path.join(__dirname, '../graphql-types/conversation-schema-types.graphql'), 'utf8');

describe('ConversationTransformer', () => {
  describe('valid schemas', () => {
    it('should transform a conversation route with query tools', () => {
      const routeName = 'pirateChat';
      const inputSchema = `
        type Temperature {
          value: Int
          unit: String
        }

        type Query {
          getTemperature(city: String!): Temperature
          plus(a: Int, b: Int): Int
        }

        type Mutation {
          ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
          @conversation(
            aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
            functionName: "conversation-handler",
            systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
            tools: [{ name: "getTemperature", description: "does a thing" }, { name: "plus", description: "does a different thing" }]
          )
        }

        ${conversationSchemaTypes}
      `;

      const out = transform(inputSchema);
      expect(out).toBeDefined();

      const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverCode).toBeDefined();
      expect(resolverCode).toMatchSnapshot();

      const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverFnCode).toBeDefined();
      expect(resolverFnCode).toMatchSnapshot();

      const schema = parse(out.schema);
      expect(print(schema)).toMatchSnapshot();
      validateModelSchema(schema);
    });

    it('conversation route with model query tool', () => {
      const routeName = 'pirateChat';
      const inputSchema = `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          content: String
          isDone: Boolean
        }

        type Mutation {
            ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
            @conversation(
              aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
              functionName: "conversation-handler",
              systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
              tools: [{ name: "listTodos", description: "lists todos" }]
            )
        }

        ${conversationSchemaTypes}
      `;

      const out = transform(inputSchema);
      expect(out).toBeDefined();

      const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverCode).toBeDefined();
      expect(resolverCode).toMatchSnapshot();

      const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverFnCode).toBeDefined();
      expect(resolverFnCode).toMatchSnapshot();

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });

    it('should transform a conversation route with inference configuration', () => {
      const routeName = 'pirateChat';

      const inputSchema = `
    type Mutation {
        ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
        @conversation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
          functionName: "conversation-handler",
          inferenceConfiguration: {
            temperature: 0.5,
            topP: 0.9,
            maxTokens: 100,
          }
        )
    }

    ${conversationSchemaTypes}
  `;

      const out = transform(inputSchema);
      expect(out).toBeDefined();

      const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverCode).toBeDefined();
      expect(resolverCode).toMatchSnapshot();

      const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverFnCode).toBeDefined();
      expect(resolverFnCode).toMatchSnapshot();

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });

    it('should transform a conversation route with a model query tool including relationships', () => {
      const routeName = 'pirateChat';
      const inputSchema = `
    type Product {
      name: String!
      price: Float!
    }
    type Customer @model @auth(rules: [{ allow: owner }]) {
      name: String
      email: String
      activeCart: Cart @hasOne(references: "customerId")
      orderHistory: [Order] @hasMany(references: "customerId")
    }

    type Cart @model @auth(rules: [{ allow: owner }]) {
      products: [Product]
      customerId: ID
      customer: Customer @belongsTo(references: "customerId")
    }

    type Order @model @auth(rules: [{ allow: owner }]) {
      products: [Product]
      customerId: ID
      customer: Customer @belongsTo(references: "customerId")
    }

    type Mutation {
        ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
        @conversation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          functionName: "conversation-handler",
          systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
          tools: [{ name: "listCustomers", description: "Provides data about the customer sending a message" }]
        )
    }

    ${conversationSchemaTypes}
  `;

      const out = transform(inputSchema);
      expect(out).toBeDefined();

      const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverCode).toBeDefined();
      expect(resolverCode).toMatchSnapshot();

      const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverFnCode).toBeDefined();
      expect(resolverFnCode).toMatchSnapshot();

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });
  });

  describe('invalid schemas', () => {
    it('should throw an error if the return type is not ConversationMessage', () => {
      const routeName = 'invalidChat';
      const inputSchema = `
        type Mutation {
          ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): String
          @conversation(
            aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
            functionName: "conversation-handler",
            systemPrompt: "You are a helpful chatbot."
          )
        }

        ${conversationSchemaTypes}
      `;

      expect(() => transform(inputSchema)).toThrow('@conversation return type must be ConversationMessage');
    });
    it('should throw an error when aiModel is missing', () => {
      const routeName = 'invalidChat';
      const inputSchema = `
        type Mutation {
          ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
          @conversation(
            functionName: "conversation-handler",
            systemPrompt: "You are a helpful chatbot."
          )
        }

        ${conversationSchemaTypes}
      `;

      expect(() => transform(inputSchema)).toThrow(
        'Directive "@conversation" argument "aiModel" of type "String!" is required, but it was not provided.',
      );
    });

    it('should throw an error when systemPrompt is missing', () => {
      const routeName = 'invalidChat';
      const inputSchema = `
        type Mutation {
          ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
          @conversation(
            aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          )
        }

        ${conversationSchemaTypes}
      `;

      expect(() => transform(inputSchema)).toThrow(
        'Directive "@conversation" argument "systemPrompt" of type "String!" is required, but it was not provided.',
      );
    });

    describe('invalid inference configuration', () => {
      const maxTokens = 'inferenceConfiguration: { maxTokens: 0 }';
      const temperature = {
        over: 'inferenceConfiguration: { temperature: 1.1 }',
        under: 'inferenceConfiguration: { temperature: -0.1 }',
      };
      const topP = {
        over: 'inferenceConfiguration: { topP: 1.1 }',
        under: 'inferenceConfiguration: { topP: -0.1 }',
      };

      const conversationRoute = (invalidInferenceConfig: string): string => {
        return `
        type Mutation {
          testChat(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
          @conversation(
            aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
            functionName: "conversation-handler",
            systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
            ${invalidInferenceConfig}
          )
        }

        ${conversationSchemaTypes}
        `;
      };

      it('maxTokens invalid', () => {
        expect(() => transform(conversationRoute(maxTokens))).toThrow(
          '@conversation directive maxTokens valid range: Minimum value of 1. Provided: 0',
        );
      });

      it('temperature over', () => {
        expect(() => transform(conversationRoute(temperature.over))).toThrow(
          '@conversation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
        );
      });

      it('topP over', () => {
        expect(() => transform(conversationRoute(topP.over))).toThrow(
          '@conversation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
        );
      });

      it('temperature under', () => {
        expect(() => transform(conversationRoute(temperature.under))).toThrow(
          '@conversation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: -0.1',
        );
      });

      it('topP under', () => {
        expect(() => transform(conversationRoute(topP.under))).toThrow(
          '@conversation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: -0.1',
        );
      });
    });
  });

  describe('parameterized tests', () => {
    const testCases = [
      { name: 'with tools', tools: '[{ name: "getTemperature", description: "does a thing" }]' },
      { name: 'without tools', tools: undefined },
      { name: 'with inference configuration', inferenceConfiguration: '{ temperature: 0.5, topP: 0.9, maxTokens: 100 }' },
    ];

    it.each(testCases)('should transform a conversation route $name', ({ name, tools, inferenceConfiguration }) => {
      const routeName = 'parameterizedChat';
      const inputSchema = `
        type Temperature {
          value: Int
          unit: String
        }

        type Query {
          getTemperature(city: String!): Temperature
        }
        type Mutation {
          ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
          @conversation(
            aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
            functionName: "conversation-handler",
            systemPrompt: "You are a helpful chatbot."
            ${tools ? `, tools: ${tools}` : ''}
            ${inferenceConfiguration ? `, inferenceConfiguration: ${inferenceConfiguration}` : ''}
          )
        }

        ${conversationSchemaTypes}
      `;

      const out = transform(inputSchema);
      expect(out).toBeDefined();

      const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverCode).toBeDefined();
      expect(resolverCode).toMatchSnapshot();

      const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
      expect(resolverFnCode).toBeDefined();
      expect(resolverFnCode).toMatchSnapshot();

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });
  });
});

const getResolverResource = (mutationName: string, resources?: Record<string, any>): Record<string, any> => {
  const resolverName = `Mutation${mutationName}Resolver`;
  return resources?.[resolverName];
};

const getResolverFnResource = (mtuationName: string, resources?: Record<string, any>): Record<string, any> => {
  const capitalizedQueryName = mtuationName.charAt(0).toUpperCase() + mtuationName.slice(1);
  const resourcePrefix = `Mutation${capitalizedQueryName}DataResolverFn`;
  if (!resources) {
    fail('No resources found.');
  }
  const resource = Object.entries(resources).find(([key, _]) => {
    return key.startsWith(resourcePrefix);
  })?.[1];

  if (!resource) {
    fail(`Resource named with prefix ${resourcePrefix} not found.`);
  }
  return resource;
};

const defaultAuthConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [],
};

function transform(
  inputSchema: string,
  dataSourceStrategies?: Record<string, ModelDataSourceStrategy>,
  authConfig: AppSyncAuthConfiguration = defaultAuthConfig,
): DeploymentResources {
  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const belongsToTransformer = new BelongsToTransformer();
  const hasManyTransformer = new HasManyTransformer();

  const transformers = [
    modelTransformer,
    new PrimaryKeyTransformer(),
    indexTransformer,
    hasManyTransformer,
    hasOneTransformer,
    belongsToTransformer,
    new ConversationTransformer(modelTransformer, hasManyTransformer, belongsToTransformer, authTransformer),
    new GenerationTransformer(),
    authTransformer,
  ];

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies,
  });

  return out;
}
