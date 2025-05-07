import { conversation } from '@aws-amplify/ai-constructs';
import { overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import { getModelDataSourceNameForTypeName, getTable, TransformerResolver } from '@aws-amplify/graphql-transformer-core';
import { DataSourceProvider, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { BackendOutputEntry, BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import * as cdk from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { FunctionResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import pluralize from 'pluralize';
import { ConversationDirectiveConfiguration, ConversationDirectiveDataSources } from '../conversation-directive-configuration';
import {
  CONVERSATION_MESSAGES_REFERENCE_FIELD_NAME,
  getFunctionStackName,
  LIST_CONVERSATIONS_INDEX_NAME,
  LIST_MESSAGES_INDEX_NAME,
  upperCaseConversationFieldName,
} from '../graphql-types/name-values';
import {
  assistantResponsePipelineDefinition,
  assistantResponseStreamPipelineDefinition,
  assistantResponseSubscriptionPipelineDefinition,
  generateResolverFunction,
  generateResolverPipeline,
  listConversationsInitFunctionDefinition,
  listMessagesInitFunctionDefinition,
  listMessagesPostProcessingFunctionDefinition,
  sendMessagePipelineDefinition,
} from '../resolvers';
import { processTools } from '../tools/process-tools';
import path from 'path';
export class ConversationResolverGenerator {
  constructor(
    private readonly functionNameMap?: Record<string, IFunction>,
    private readonly outputStorageStrategy?: BackendOutputStorageStrategy<BackendOutputEntry>,
  ) {}

  /**
   * Generates resolvers for all conversation directives.
   * Note: This function mutates `ConversationDirectiveConfiguration` objects by adding `dataSources` and `toolSpec` properties.
   * @param directives - An array of ConversationDirectiveConfiguration objects.
   * @param ctx - The transformer context provider.
   */
  generateResolvers(directives: ConversationDirectiveConfiguration[], ctx: TransformerContextProvider): void {
    for (const directive of directives) {
      // Process tools and generate tool specifications
      // This step is done here to ensure that model-generated queries exist
      // (they have been processed by the model transformer)
      directive.toolSpec = processTools(directive.tools, ctx);

      // Generate data sources for the given conversation directive instance.
      // These are used by the resolver function and pipeline definitions.
      directive.dataSources = this.generateDataSources(directive, ctx);

      // Set up the conversation table index
      this.setUpConversationTableIndex(ctx, directive);

      // Set up the message table index
      this.setupMessageTableIndex(ctx, directive);

      // Generate resolvers for the given conversation directive instance.
      this.generateResolversForDirective(directive, ctx);

      // Add an init slot to the model-transformer generated list conversations pipeline
      this.addInitSlotToListConversationsPipeline(ctx, directive);

      // Add an init and postDataLoad slot to the model-transformer generated list messages pipeline
      // This is done to ensure that the correct index is used for list queries.
      this.addSlotsToListMessagesPipeline(ctx, directive);
    }
  }

  private generateDataSources(
    directive: ConversationDirectiveConfiguration,
    ctx: TransformerContextProvider,
  ): ConversationDirectiveDataSources {
    // Create a function stack for the conversation directive
    const functionStackName = getFunctionStackName(directive);
    const functionStack = ctx.stackManager.createStack(functionStackName);
    const capitalizedFieldName = upperCaseConversationFieldName(directive);

    // Set up the function data source
    const { functionDataSourceId, referencedFunction } = this.setupFunctionDataSource(
      directive,
      functionStack,
      capitalizedFieldName,
    );
    const lambdaFunctionDataSource = this.addLambdaDataSource(ctx, functionDataSourceId, referencedFunction, functionStackName);

    // Set up attachment handler data source
    const attachmentHandler = this.setupAttachmentHandlerHandler(functionStack, capitalizedFieldName);
    const attachmentLambdaFunctionDataSource = this.addLambdaDataSource(
      ctx,
      attachmentHandler.functionDataSourceId,
      attachmentHandler.referencedFunction,
      functionStackName
    );

    // Get data sources for conversation message and session
    const conversationMessageTableDataSourceName = getModelDataSourceNameForTypeName(ctx, directive.message.model.name.value);
    const messageTableDataSource = ctx.api.host.getDataSource(conversationMessageTableDataSourceName) as DataSourceProvider;

    const conversationTableDataSourceName = getModelDataSourceNameForTypeName(ctx, directive.conversation.model.name.value);
    const conversationTableDataSource = ctx.api.host.getDataSource(conversationTableDataSourceName) as DataSourceProvider;

    return {
      attachmentLambdaFunctionDataSource,
      lambdaFunctionDataSource,
      messageTableDataSource,
      conversationTableDataSource,
    };
  }

  /**
   * Generates resolvers for a given conversation directive.
   * @param directive - The conversation directive configuration.
   * @param ctx - The transformer context provider.
   */
  private generateResolversForDirective(directive: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void {
    const parentName = directive.parent.name.value;
    const fieldName = directive.field.name.value;

    // Generate and add resolvers for send message, assistant response, and subscription
    const conversationPipelineResolver = generateResolverPipeline(sendMessagePipelineDefinition, directive, ctx);
    ctx.resolvers.addResolver(parentName, fieldName, conversationPipelineResolver);

    const assistantResponsePipelineResolver = generateResolverPipeline(assistantResponsePipelineDefinition, directive, ctx);
    ctx.resolvers.addResolver(parentName, directive.assistantResponseMutation.field.name.value, assistantResponsePipelineResolver);

    const assistantResponseStreamingPipelineResolver = generateResolverPipeline(assistantResponseStreamPipelineDefinition, directive, ctx);
    ctx.resolvers.addResolver(
      parentName,
      directive.assistantResponseStreamingMutation.field.name.value,
      assistantResponseStreamingPipelineResolver,
    );

    const assistantResponseSubscriptionPipelineResolver = generateResolverPipeline(
      assistantResponseSubscriptionPipelineDefinition,
      directive,
      ctx,
    );
    ctx.resolvers.addResolver(
      'Subscription',
      directive.assistantResponseSubscriptionField.name.value,
      assistantResponseSubscriptionPipelineResolver,
    );
  }

  /**
   * Sets up the function data source
   * @param directive - The conversation directive configuration
   * @param functionStack - The function stack
   * @param capitalizedFieldName - The capitalized field name
   * @returns The function data source ID and referenced function
   */
  private setupFunctionDataSource(
    directive: ConversationDirectiveConfiguration,
    functionStack: cdk.Stack,
    capitalizedFieldName: string,
  ): { functionDataSourceId: string; referencedFunction: IFunction } {
    if (directive.handler) {
      return this.setupExistingFunctionDataSource(directive.handler.functionName);
    } else if (directive.functionName) {
      return this.setupExistingFunctionDataSource(directive.functionName);
    } else {
      return this.setupDefaultConversationHandler(functionStack, capitalizedFieldName, directive.aiModel);
    }
  }

  /**
   * Sets up a data source for an existing Lambda function
   * @param functionName - The name of the existing Lambda function
   * @param functionStack - The CDK stack to add the function to
   * @returns An object containing the function data source ID and the referenced function
   */
  private setupExistingFunctionDataSource(functionName: string): { functionDataSourceId: string; referencedFunction: IFunction } {
    const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(functionName);
    if (!this.functionNameMap) {
      throw new Error('Function name map is not provided');
    }
    const referencedFunction = this.functionNameMap[functionName];
    if (!referencedFunction) {
      throw new Error(`Function ${functionName} not found in function name map`);
    }
    return { functionDataSourceId, referencedFunction };
  }

  /**
   * Sets up a default conversation handler function
   * @param functionStack - The CDK stack to add the function to
   * @param capitalizedFieldName - The capitalized field name
   * @param aiModel - The AI model to use for the conversation
   * @returns An object containing the function data source ID and the created function
   */
  private setupDefaultConversationHandler(
    functionStack: cdk.Stack,
    capitalizedFieldName: string,
    modelId: string,
  ): { functionDataSourceId: string; referencedFunction: IFunction } {
    const defaultConversationHandler = new conversation.ConversationHandlerFunction(
      functionStack,
      `${capitalizedFieldName}DefaultConversationHandler`,
      {
        models: [
          {
            modelId,
          },
        ],
        outputStorageStrategy: this.outputStorageStrategy,
      },
    );

    const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(`${capitalizedFieldName}DefaultConversationHandler`);
    const referencedFunction = defaultConversationHandler.resources.lambda;

    return { functionDataSourceId, referencedFunction };
  }

  /**
   * Sets up an attachment handler function
   * @param functionStack - The CDK stack to add the function to
   * @param capitalizedFieldName - The capitalized field name
   * @returns An object containing the function data source ID and the created function
   */
  private setupAttachmentHandlerHandler(
    functionStack: cdk.Stack,
    capitalizedFieldName: string,
  ): { functionDataSourceId: string; referencedFunction: IFunction } {
    const defaultConversationHandler = new cdk.aws_lambda_nodejs.NodejsFunction(
      functionStack,
      `${capitalizedFieldName}ConversationAttachmentHandler`,
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
        entry: path.resolve(__dirname, 'attachment-lambda', 'handler.js'),
      },
    );

    const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(`${capitalizedFieldName}ConversationAttachmentHandler`);
    const referencedFunction = defaultConversationHandler;

    return { functionDataSourceId, referencedFunction };
  }

  /**
   * Adds a Lambda data source to the API
   * @param ctx - The transformer context provider
   * @param functionDataSourceId - The unique identifier for the function data source
   * @param referencedFunction - The Lambda function to be added as a data source
   * @param stackName - The name of the stack where the data source will be added
   * @returns The created Lambda data source
   */
  private addLambdaDataSource(
    ctx: TransformerContextProvider,
    functionDataSourceId: string,
    referencedFunction: IFunction,
    functionStackName: string,
  ): DataSourceProvider {
    const functionDataSourceScope = ctx.stackManager.getScopeFor(functionDataSourceId, functionStackName);
    return ctx.api.host.addLambdaDataSource(functionDataSourceId, referencedFunction, {}, functionDataSourceScope);
  }

  /**
   * Adds an init and postDataLoad slot to the list messages pipeline resolver.
   *
   * @param ctx - The transformer context provider.
   * @param directive - The conversation directive configuration.
   */
  private addSlotsToListMessagesPipeline(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const messageName = directive.message.model.name.value;
    const pluralized = pluralize(messageName);
    const listMessagesResolver = ctx.resolvers.getResolver('Query', `list${pluralized}`) as TransformerResolver;

    const initResolverFn = generateResolverFunction(listMessagesInitFunctionDefinition, directive, ctx);
    listMessagesResolver.addJsFunctionToSlot(listMessagesInitFunctionDefinition.slotName, initResolverFn);

    const postProcessingResolverFn = generateResolverFunction(listMessagesPostProcessingFunctionDefinition, directive, ctx);
    listMessagesResolver.addJsFunctionToSlot(listMessagesPostProcessingFunctionDefinition.slotName, postProcessingResolverFn);
  }

  private addInitSlotToListConversationsPipeline(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const conversationName = directive.conversation.model.name.value;
    const pluralized = pluralize(conversationName);
    const listConversationsResolver = ctx.resolvers.getResolver('Query', `list${pluralized}`) as TransformerResolver;
    const initResolverFn = generateResolverFunction(listConversationsInitFunctionDefinition, directive, ctx);
    listConversationsResolver.addJsFunctionToSlot('init', initResolverFn);
  }

  /**
   * Sets up the message table index
   * @param ctx - The transformer context provider
   * @param directive - The conversation directive configuration
   */
  private setupMessageTableIndex(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const messageName = directive.message.model.name.value;
    const message = directive.message.model;

    const conversationMessagesTable = getTable(ctx, message);
    const gsiPartitionKeyName = CONVERSATION_MESSAGES_REFERENCE_FIELD_NAME;
    const gsiPartitionKeyType = 'S';
    const gsiSortKeyName = 'createdAt';
    const gsiSortKeyType = 'S';

    this.addGlobalSecondaryIndex(
      conversationMessagesTable,
      ctx,
      messageName,
      LIST_MESSAGES_INDEX_NAME,
      { name: gsiPartitionKeyName, type: gsiPartitionKeyType },
      { name: gsiSortKeyName, type: gsiSortKeyType },
    );
  }

  /**
   * Sets up the conversation table index
   * @param ctx - The transformer context provider
   * @param directive - The conversation directive configuration
   */
  private setUpConversationTableIndex(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const conversationName = directive.conversation.model.name.value;
    const conversation = directive.conversation.model;

    const conversationTable = getTable(ctx, conversation);
    const gsiPartitionKeyName = '__typename';
    const gsiPartitionKeyType = 'S';
    const gsiSortKeyName = 'updatedAt';
    const gsiSortKeyType = 'S';

    this.addGlobalSecondaryIndex(
      conversationTable,
      ctx,
      conversationName,
      LIST_CONVERSATIONS_INDEX_NAME,
      { name: gsiPartitionKeyName, type: gsiPartitionKeyType },
      { name: gsiSortKeyName, type: gsiSortKeyType },
    );
  }

  /**
   * Adds a Global Secondary Index (GSI) to a DynamoDB table and overrides it at the CloudFormation level.
   *
   * @param table - The DynamoDB table to which the GSI will be added.
   * @param indexName - The name of the GSI.
   * @param partitionKey - The partition key definition for the GSI.
   * @param sortKey - The sort key definition for the GSI.
   * @param ctx - The transformer context provider.
   * @param typeName - The name of the GraphQL type associated with this table.
   *
   * This function performs the following steps:
   * 1. Adds a GSI to the table using the provided parameters.
   * 2. Retrieves the newly added GSI from the table's globalSecondaryIndexes.
   * 3. Creates a new index configuration with conditional provisioned throughput.
   * 4. Overrides the index at the CloudFormation level using the new configuration.
   */
  private addGlobalSecondaryIndex(
    table: any,
    ctx: TransformerContextProvider,
    typeName: string,
    indexName: string,
    partitionKey: KeyAttributeDefinition,
    sortKey: KeyAttributeDefinition,
  ): void {
    table.addGlobalSecondaryIndex({
      indexName,
      // TODO: update to only project keys that we need when retrieving history
      projectionType: 'ALL',
      partitionKey,
      sortKey,
      readCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      writeCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    });

    const gsi = table.globalSecondaryIndexes.find((g: any) => g.indexName === indexName);

    const newIndex = {
      indexName,
      keySchema: gsi.keySchema,
      projection: { projectionType: 'ALL' },
      provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
        ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
        WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
      }),
    };

    overrideIndexAtCfnLevel(ctx, typeName, table, newIndex);
  }
}

type KeyAttributeDefinition = {
  name: string;
  type: 'S' | 'N';
};
