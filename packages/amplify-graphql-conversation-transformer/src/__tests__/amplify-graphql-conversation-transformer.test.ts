import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { ConversationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GenerationTransformer } from '@aws-amplify/graphql-generation-transformer';
import { toUpper } from 'graphql-transformer-common';

const conversationSchemaTypes = fs.readFileSync(path.join(__dirname, 'schemas/conversation-schema-types.graphql'), 'utf8');

const getSchema = (fileName: string, substitutions: Record<string, string> = {}) => {
  let schema = fs.readFileSync(path.join(__dirname, '/schemas/', fileName), 'utf8');
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = schema.replace(new RegExp(key, 'g'), value);
    schema = replaced;
  });
  return schema + '\n' + conversationSchemaTypes;
};

describe('ConversationTransformer', () => {
  describe('valid schemas', () => {
    it.each([
      ['conversation route with query tools', 'conversation-route-custom-query-tool.graphql'],
      ['conversation route with model query tool', 'conversation-route-model-query-tool.graphql'],
      ['conversation route with inference configuration', 'conversation-route-with-inference-configuration.graphql'],
      [
        'conversation route with model query tool including relationships',
        'conversation-route-model-query-tool-with-relationships.graphql',
      ],
    ])('should transform %s', (_, schemaFile) => {
      const routeName = 'pirateChat';
      const inputSchema = getSchema(schemaFile, { ROUTE_NAME: routeName });

      const out = transform(inputSchema);
      expect(out).toBeDefined();
      assertResolverSnapshot(routeName, out);

      const schema = parse(out.schema);
      validateModelSchema(schema);
    });
  });

  describe('invalid schemas', () => {
    it('should throw an error if the return type is not ConversationMessage', () => {
      const inputSchema = getSchema('conversation-route-invalid-return-type.graphql');
      expect(() => transform(inputSchema)).toThrow('@conversation return type must be ConversationMessage');
    });

    it.each([
      ['aiModel', 'conversation-route-invalid-missing-ai-model.graphql'],
      ['systemPrompt', 'conversation-route-invalid-missing-system-prompt.graphql'],
    ])('should throw an error when %s is missing in directive definition', (argName, schemaFile) => {
      const inputSchema = getSchema(schemaFile);
      expect(() => transform(inputSchema)).toThrow(
        `Directive "@conversation" argument "${argName}" of type "String!" is required, but it was not provided.`,
      );
    });

    describe('invalid inference configuration', () => {
      it.each([
        ['maxTokens', 0, 'Minimum value of 1'],
        ['temperature', 1.1, 'Minimum value of 0. Maximum value of 1'],
        ['temperature', -0.1, 'Minimum value of 0. Maximum value of 1'],
        ['topP', 1.1, 'Minimum value of 0. Maximum value of 1'],
        ['topP', -0.1, 'Minimum value of 0. Maximum value of 1'],
      ])('throws error for %s with value %s', (param, value, errorMessage) => {
        const INFERENENCE_CONFIGURATION = `inferenceConfiguration: { ${param}: ${value} }`;
        const inputSchema = getSchema('conversation-route-inference-configuration-template.graphql', { INFERENENCE_CONFIGURATION });
        expect(() => transform(inputSchema)).toThrow(`@conversation directive ${param} valid range: ${errorMessage}. Provided: ${value}`);
      });
    });
  });
});

const assertResolverSnapshot = (routeName: string, resources: DeploymentResources) => {
  const resolverCode = getResolverResource(routeName, resources.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const authFn = resources?.resolvers[`Mutation.${routeName}.auth.js`];
  expect(authFn).toBeDefined();
  expect(authFn).toMatchSnapshot();

  const verifySessionOwnerFn = resources?.resolvers[`Mutation.${routeName}.verify-session-owner.js`];
  expect(verifySessionOwnerFn).toBeDefined();
  expect(verifySessionOwnerFn).toMatchSnapshot();

  const writeMessageToTableFn = resources?.resolvers[`Mutation.${routeName}.write-message-to-table.js`];
  expect(writeMessageToTableFn).toBeDefined();
  expect(writeMessageToTableFn).toMatchSnapshot();

  const invokeLambdaFn = resources?.resolvers[`Mutation.${routeName}.invoke-lambda.js`];
  expect(invokeLambdaFn).toBeDefined();
  expect(invokeLambdaFn).toMatchSnapshot();
};

const getResolverResource = (mutationName: string, resources?: Record<string, any>): Record<string, any> => {
  const resolverName = `Mutation${mutationName}Resolver`;
  return resources?.[resolverName];
};

const getResolverFnResource = (mutationName: string, resources: DeploymentResources): string => {
  const resolverFnCode =
    resources.rootStack.Resources &&
    Object.entries(resources.rootStack.Resources).find(([key, _]) => key.startsWith(`Mutation${toUpper(mutationName)}DataResolverFn`))?.[1][
      'Properties'
    ]['Code'];

  return resolverFnCode;
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
