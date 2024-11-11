import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { GenerationTransformer } from '@aws-amplify/graphql-generation-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform, TransformManager } from '@aws-amplify/graphql-transformer-test-utils';
import { Code, Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as fs from 'fs-extra';
import { parse } from 'graphql';
import { toUpper } from 'graphql-transformer-common';
import * as path from 'path';
import { ConversationTransformer } from '..';

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
      assertSendMessageMutationResources(routeName, out);
      assertAssistantResponseMutationResources(routeName, out);
      assertAssistantResponseSubscriptionResources(routeName, out);
      assertAssistantResponseStreamMutationResources(routeName, out);
      assertSlotsForModelGeneratedOperations(routeName, out);
      const schema = parse(out.schema);
      validateModelSchema(schema);
    });

    it.each([
      ['functionName', 'conversation-route-custom-handler-deprecated.graphql'],
      ['handler ', 'conversation-route-custom-handler.graphql'],
    ])('uses functionMap for custom handler - %s', (_, schemaFile) => {
      const routeName = 'pirateChat';
      const inputSchema = getSchema(schemaFile, { ROUTE_NAME: routeName });

      const transformerManager = new TransformManager();
      const stack = transformerManager.getTransformScope();
      const customHandler = new Function(stack, 'conversation-handler', {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromInline('exports.handler = async (event) => { return "Hello World"; }'),
        handler: 'index.handler',
      });

      const functionMap = {
        [`Fn${routeName}`]: customHandler,
      };

      const out = transform(inputSchema, {}, defaultAuthConfig, functionMap, transformerManager);
      expect(out).toBeDefined();

      const expectedCustomHandlerArn = out.rawRootStack.resolve(customHandler.functionArn);
      const conversationLambdaStackName = `${toUpper(routeName)}ConversationDirectiveLambdaStack`;
      const conversationLambdaDataSourceName = `Fn${routeName}LambdaDataSource`;
      const conversationLambdaDataSourceFunctionArnRef =
        out.stacks[conversationLambdaStackName].Resources?.[conversationLambdaDataSourceName].Properties.LambdaConfig.LambdaFunctionArn.Ref;
      const lambdaDataSourceFunctionArn =
        out.rootStack.Resources?.[conversationLambdaStackName].Properties?.Parameters?.[conversationLambdaDataSourceFunctionArnRef];
      expect(lambdaDataSourceFunctionArn).toEqual(expectedCustomHandlerArn);
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

    describe('invalid tool definition', () => {
      it('should throw an error if model operation and custom tool fields are mixed', () => {
        const inputSchema = getSchema('conversation-route-invalid-tool-definition-mixed-fields.graphql');
        expect(() => transform(inputSchema)).toThrow('Invalid tool definitions: calculator');
      });

      it('should throw an error if required fields are missing', () => {
        const inputSchema = getSchema('conversation-route-invalid-tool-definition-missing-fields.graphql');
        expect(() => transform(inputSchema)).toThrow('Invalid tool definitions: calculator');
      });
    });

    describe('invalid custom handler configuration', () => {
      it('should throw if both functionName and handler are provided', () => {
        const inputSchema = getSchema('conversation-route-invalid-custom-handler-function-name-and-handler-provided.graphql');
        expect(() => transform(inputSchema)).toThrow("'functionName' and 'handler' are mutually exclusive");
      });

      it.each([['0.5'], ['2.0']])('throws error for event version $s', (eventVersion) => {
        const inputSchema = getSchema('conversation-route-invalid-custom-handler-event-version.graphql', { EVENT_VERSION: eventVersion });
        expect(() => transform(inputSchema)).toThrow(
          `Unsupported custom conversation handler. Expected eventVersion to match 1.x, received ${eventVersion}`,
        );
      });
    });
  });
});

const assertSlotsForModelGeneratedOperations = (routeName: string, resources: DeploymentResources) => {
  const listMessagesInitFn = resources.resolvers[`Query.${routeName}.list-messages-init.js`];
  expect(listMessagesInitFn).toBeDefined();
  expect(listMessagesInitFn).toMatchSnapshot('ListMessagesInit resolver function code');

  const listMessagesPostDataLoadFn = resources.resolvers[`Query.${routeName}.list-messages-post-processing.js`];
  expect(listMessagesPostDataLoadFn).toBeDefined();
  expect(listMessagesPostDataLoadFn).toMatchSnapshot('ListMessagesPostDataLoad resolver function code');

  const listConversationsInitFn = resources.resolvers[`Query.${routeName}.list-conversations-init.js`];
  expect(listConversationsInitFn).toBeDefined();
  expect(listConversationsInitFn).toMatchSnapshot('ListConversationsInit resolver function code');
};

const assertAssistantResponseSubscriptionResources = (routeName: string, resources: DeploymentResources) => {
  const resolverName = `SubscriptiononCreateAssistantResponse${toUpper(routeName)}Resolver`;

  // ----- Function Code Assertions -----
  const resolverCode = resources.rootStack.Resources?.[resolverName].Properties.Code;
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot('AssistantResponseSubscription resolver code');

  const dataFn = resources.resolvers[`Subscription.onCreateAssistantResponse${toUpper(routeName)}.assistant-message.js`];
  expect(dataFn).toBeDefined();
  expect(dataFn).toMatchSnapshot('AssistantResponseSubscription data slot function code');
};

const assertAssistantResponseStreamMutationResources = (routeName: string, resources: DeploymentResources) => {
  const resolverName = `MutationcreateAssistantResponseStream${toUpper(routeName)}Resolver`;

  // ----- Function Code Assertions -----
  const resolverCode = resources.rootStack.Resources?.[resolverName].Properties.Code;
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot('AssistantResponseStreamMutation resolver code');

  // Need to do this song and dance because the init slot is an inline function.
  // It's not accessible via `resources.resolvers`.
  const initFn = getFunctionConfigurationForPipelineSlot(resources, resolverName, 0).Properties.Code;
  expect(initFn).toBeDefined();
  expect(initFn).toMatchSnapshot('AssistantResponseStreamMutation init slot function code');

  const authFn = resources.resolvers[`Mutation.createAssistantResponseStream${toUpper(routeName)}.auth.js`];
  expect(authFn).toBeDefined();
  expect(authFn).toMatchSnapshot('AssistantResponseStreamMutation auth slot function code');

  const verifySessionOwnerFn = resources.resolvers[`Mutation.createAssistantResponseStream${toUpper(routeName)}.verify-session-owner.js`];
  expect(verifySessionOwnerFn).toBeDefined();
  expect(verifySessionOwnerFn).toMatchSnapshot('AssistantResponseStreamMutation verify session owner slot function code');

  const dataFn = resources.resolvers[`Mutation.createAssistantResponseStream${toUpper(routeName)}.persist-message.js`];
  expect(dataFn).toBeDefined();
  expect(dataFn).toMatchSnapshot('AssistantResponseStreamMutation data slot function code');

  // ----- Data Source Assertions -----
  const verifySessionOwnerFnDataSourceName = getFunctionConfigurationForPipelineSlot(resources, resolverName, 2).Properties.DataSourceName[
    'Fn::GetAtt'
  ][0];
  expect(verifySessionOwnerFnDataSourceName).toBeDefined();
  expect(verifySessionOwnerFnDataSourceName).toEqual(conversationTableDataSourceName(routeName));

  const dataResolverSlotFnDataSourceName = getFunctionConfigurationForPipelineSlot(resources, resolverName, 3).Properties.DataSourceName[
    'Fn::GetAtt'
  ][0];
  expect(dataResolverSlotFnDataSourceName).toBeDefined();
  expect(dataResolverSlotFnDataSourceName).toEqual(messageTableDataSourceName(routeName));
};

const assertAssistantResponseMutationResources = (routeName: string, resources: DeploymentResources) => {
  const resolverName = `MutationcreateAssistantResponse${toUpper(routeName)}Resolver`;

  // ----- Function Code Assertions -----
  const resolverCode = resources.rootStack.Resources?.[resolverName].Properties.Code;
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot('AssistantResponseMutation resolver code');

  const initFn = resources.resolvers[`Mutation.createAssistantResponse${toUpper(routeName)}.init.js`];
  expect(initFn).toBeDefined();
  expect(initFn).toMatchSnapshot('AssistantResponseMutation init slot function code');

  const authFn = resources.resolvers[`Mutation.createAssistantResponse${toUpper(routeName)}.auth.js`];
  expect(authFn).toBeDefined();
  expect(authFn).toMatchSnapshot('AssistantResponseMutation auth slot function code');

  const verifySessionOwnerFn = resources.resolvers[`Mutation.createAssistantResponse${toUpper(routeName)}.verify-session-owner.js`];
  expect(verifySessionOwnerFn).toBeDefined();
  expect(verifySessionOwnerFn).toMatchSnapshot('AssistantResponseMutation verify session owner slot function code');

  // ----- Data Source Assertions -----
  const verifySessionOwnerFnDataSourceName = getFunctionConfigurationForPipelineSlot(resources, resolverName, 2).Properties.DataSourceName[
    'Fn::GetAtt'
  ][0];
  expect(verifySessionOwnerFnDataSourceName).toBeDefined();
  expect(verifySessionOwnerFnDataSourceName).toEqual(conversationTableDataSourceName(routeName));

  const dataFnDataSourceName = getFunctionConfigurationForPipelineSlot(resources, resolverName, 3).Properties.DataSourceName[
    'Fn::GetAtt'
  ][0];
  expect(dataFnDataSourceName).toBeDefined();
  expect(dataFnDataSourceName).toEqual(messageTableDataSourceName(routeName));
};

const assertSendMessageMutationResources = (routeName: string, resources: DeploymentResources) => {
  const resolverName = `Mutation${routeName}Resolver`;

  // ----- Function Code Assertions -----
  const resolverCode = resources.rootStack.Resources?.[resolverName].Properties.Code;
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot('SendMessageMutation resolver code');

  // Need to do this song and dance because the init slot is an inline function.
  // It's not accessible via `resources.resolvers`.
  const initFn = getFunctionConfigurationForPipelineSlot(resources, resolverName, 0).Properties.Code;
  expect(initFn).toBeDefined();
  expect(initFn).toMatchSnapshot('SendMessageMutation init slot function code');

  const authFn = resources?.resolvers[`Mutation.${routeName}.auth.js`];
  expect(authFn).toBeDefined();
  expect(authFn).toMatchSnapshot('SendMessageMutation auth slot function code');

  const verifySessionOwnerFn = resources?.resolvers[`Mutation.${routeName}.verify-session-owner.js`];
  expect(verifySessionOwnerFn).toBeDefined();
  expect(verifySessionOwnerFn).toMatchSnapshot('SendMessageMutation verify session owner slot function code');

  const writeMessageToTableFn = resources?.resolvers[`Mutation.${routeName}.write-message-to-table.js`];
  expect(writeMessageToTableFn).toBeDefined();
  expect(writeMessageToTableFn).toMatchSnapshot('SendMessageMutation write message to table slot function code');

  const invokeLambdaFn = resources?.resolvers[`Mutation.${routeName}.invoke-lambda.js`];
  expect(invokeLambdaFn).toBeDefined();
  expect(invokeLambdaFn).toMatchSnapshot('SendMessageMutation invoke lambda slot function code');

  // ----- Data Source Assertions -----
  const verifySessionOwnerFnDataSourceName = getFunctionConfigurationForPipelineSlot(resources, resolverName, 2).Properties.DataSourceName[
    'Fn::GetAtt'
  ][0];
  expect(verifySessionOwnerFnDataSourceName).toBeDefined();
  expect(verifySessionOwnerFnDataSourceName).toEqual(conversationTableDataSourceName(routeName));

  const writeMessageToTableFnDataSourceName = getFunctionConfigurationForPipelineSlot(resources, resolverName, 3).Properties.DataSourceName[
    'Fn::GetAtt'
  ][0];
  expect(writeMessageToTableFnDataSourceName).toBeDefined();
  expect(writeMessageToTableFnDataSourceName).toEqual(messageTableDataSourceName(routeName));

  // The lambda function is deployed in a separate stack, so we need to resolve the stack name.
  const invokeLambdaFnDataSource = getFunctionConfigurationForPipelineSlot(resources, resolverName, 4).Properties.DataSourceName[
    'Fn::GetAtt'
  ];
  expect(invokeLambdaFnDataSource).toBeDefined();
  const stackName = invokeLambdaFnDataSource[0];
  expect(stackName).toEqual(lambdaFunctionStackName(routeName));

  // Then we get the data source name from that stack.
  const outputsKey = invokeLambdaFnDataSource[1].split('Outputs.')[1];
  const lambdaDataSourceName = resources.stacks?.[stackName].Outputs?.[outputsKey].Value['Fn::GetAtt'][0];
  expect(lambdaDataSourceName).toEqual(lambdaFunctionDataSourceName(routeName));
};

const conversationTableDataSourceName = (routeName: string) => `Conversation${toUpper(routeName)}`;
const messageTableDataSourceName = (routeName: string) => `ConversationMessage${toUpper(routeName)}`;
const lambdaFunctionStackName = (routeName: string) => `${toUpper(routeName)}ConversationDirectiveLambdaStack`;
const lambdaFunctionDataSourceName = (routeName: string) => `${toUpper(routeName)}DefaultConversationHandlerLambdaDataSource`;

const getFunctionConfigurationForPipelineSlot = (resources: Record<string, any>, resolverName: string, slot: number): any => {
  const functionName = resources.rootStack.Resources?.[resolverName].Properties.PipelineConfig.Functions[slot]['Fn::GetAtt'][0];
  return resources.rootStack.Resources[functionName];
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
  functionMap?: Record<string, IFunction>,
  transformerManager?: TransformManager,
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
    new ConversationTransformer(modelTransformer, hasManyTransformer, belongsToTransformer, authTransformer, functionMap),
    new GenerationTransformer(),
    authTransformer,
  ];

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies,
    transformerManager,
  });

  return out;
}
