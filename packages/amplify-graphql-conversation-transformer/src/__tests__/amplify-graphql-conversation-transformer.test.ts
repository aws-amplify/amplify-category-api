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

const conversationSchemaTypes = fs.readFileSync(path.join(__dirname, 'schemas/conversation-schema-types.graphql'), 'utf8');

const getSchema = (fileName: string, template: Record<string, string>) => {
  const schema = fs.readFileSync(path.join(__dirname, '/schemas/', fileName), 'utf8');
  const templated = schema.replace(/\${([^}]*)}/g, (_, k) => template[k]);
  return templated + '\n' + conversationSchemaTypes;
};

describe('ConversationTransformer', () => {
  describe('valid schemas', () => {
    it('should transform a conversation route with query tools', () => {
      const routeName = 'pirateChat';
      const inputSchema = getSchema('conversation-route-custom-query-tool.graphql', { routeName });

      const out = transform(inputSchema);
      expect(out).toBeDefined();
      assertResolverSnapshot(routeName, out);

      const schema = parse(out.schema);
      expect(print(schema)).toMatchSnapshot();
      validateModelSchema(schema);
    });

    it('conversation route with model query tool', () => {
      const routeName = 'pirateChat';
      const inputSchema = getSchema('conversation-route-model-query-tool.graphql', { routeName });

      const out = transform(inputSchema);
      expect(out).toBeDefined();
      assertResolverSnapshot(routeName, out);

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });

    it('should transform a conversation route with inference configuration', () => {
      const routeName = 'pirateChat';
      const inputSchema = getSchema('conversation-route-with-inference-configuration.graphql', { routeName });

      const out = transform(inputSchema);
      expect(out).toBeDefined();
      assertResolverSnapshot(routeName, out);

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });

    it('should transform a conversation route with a model query tool including relationships', () => {
      const routeName = 'pirateChat';
      const inputSchema = getSchema('conversation-route-model-query-tool-with-relationships.graphql', { routeName });

      const out = transform(inputSchema);
      expect(out).toBeDefined();
      assertResolverSnapshot(routeName, out);

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });
  });

  describe('invalid schemas', () => {
    it('should throw an error if the return type is not ConversationMessage', () => {
      const routeName = 'invalidChat';
      const inputSchema = getSchema('conversation-route-invalid-return-type.graphql', { routeName });
      expect(() => transform(inputSchema)).toThrow('@conversation return type must be ConversationMessage');
    });

    it('should throw an error when aiModel is missing', () => {
      const routeName = 'invalidChat';
      const inputSchema = getSchema('conversation-route-invalid-missing-ai-model.graphql', { routeName });
      expect(() => transform(inputSchema)).toThrow(
        'Directive "@conversation" argument "aiModel" of type "String!" is required, but it was not provided.',
      );
    });

    it('should throw an error when systemPrompt is missing', () => {
      const routeName = 'invalidChat';
      const inputSchema = getSchema('conversation-route-invalid-missing-system-prompt.graphql', { routeName });
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

      const conversationRoute = (inferenceConfiguration: string): string => {
        return getSchema('conversation-route-inference-configuration-template.graphql', { inferenceConfiguration });
      };

      it('throws error for maxTokens under', () => {
        expect(() => transform(conversationRoute(maxTokens))).toThrow(
          '@conversation directive maxTokens valid range: Minimum value of 1. Provided: 0',
        );
      });

      it('throws error for temperature over', () => {
        expect(() => transform(conversationRoute(temperature.over))).toThrow(
          '@conversation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
        );
      });

      it('throws error for topP over', () => {
        expect(() => transform(conversationRoute(topP.over))).toThrow(
          '@conversation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
        );
      });

      it('throws error for temperature under', () => {
        expect(() => transform(conversationRoute(temperature.under))).toThrow(
          '@conversation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: -0.1',
        );
      });

      it('throws error for topP under', () => {
        expect(() => transform(conversationRoute(topP.under))).toThrow(
          '@conversation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: -0.1',
        );
      });
    });
  });
});

const assertResolverSnapshot = (routeName: string, resources: DeploymentResources) => {
  const resolverCode = getResolverResource(routeName, resources.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(routeName, resources.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();
};

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
