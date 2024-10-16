import { conversation } from '@aws-amplify/ai-constructs';
import { overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import { getModelDataSourceNameForTypeName, getTable, TransformerResolver } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { FunctionResourceIDs, ResourceConstants, toUpper } from 'graphql-transformer-common';
import pluralize from 'pluralize';
import { ConversationDirectiveConfiguration } from '../conversation-directive-types';
import {
  ASSISTANT_RESPONSE_PIPELINE,
  ASSISTANT_RESPONSE_SUBSCRIPTION_PIPELINE,
  generateResolverPipeline,
  generateResolverFunction,
  LIST_MESSAGES_INIT_FUNCTION,
  SEND_MESSAGE_PIPELINE,
} from '../resolvers';
import { processTools } from '../utils/tools';

type KeyAttributeDefinition = {
  name: string;
  type: 'S' | 'N';
};

// TODO: add explanation for the tool model queries
export class ConversationResolverGenerator {
  constructor(private readonly functionNameMap?: Record<string, IFunction>) {}

  generateResolvers(directives: ConversationDirectiveConfiguration[], ctx: TransformerContextProvider): void {
    for (const directive of directives) {
      directive.toolSpec = processTools(directive.tools, ctx);
      this.generateResolversForDirective(directive, ctx);
      this.addInitSlotToListMessagesPipeline(ctx, directive);
    }
  }

  private generateResolversForDirective(directive: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void {
    const { parent, field } = directive;
    const parentName = parent.name.value;
    const capitalizedFieldName = toUpper(field.name.value);
    const fieldName = field.name.value;

    const functionStack = this.createFunctionStack(ctx, capitalizedFieldName);
    const { functionDataSourceId, referencedFunction } = this.setupFunctionDataSource(directive, functionStack, capitalizedFieldName);
    const functionDataSource = this.addLambdaDataSource(ctx, functionDataSourceId, referencedFunction, capitalizedFieldName);

    const conversationMessageDataSourceName = getModelDataSourceNameForTypeName(ctx, `ConversationMessage${capitalizedFieldName}`);
    const conversationMessageDataSource = ctx.api.host.getDataSource(conversationMessageDataSourceName);

    const sessionModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, `Conversation${capitalizedFieldName}`);
    const conversationSessionDDBDataSource = ctx.api.host.getDataSource(sessionModelDDBDataSourceName);

    this.setupMessageTableIndex(ctx, directive);

    directive.dataSources = {
      lambdaFunction: functionDataSource,
      conversationTable: conversationSessionDDBDataSource as any,
      messageTable: conversationMessageDataSource as any,
    };

    const conversationPipelineResolver = generateResolverPipeline(SEND_MESSAGE_PIPELINE, directive);
    ctx.resolvers.addResolver(parentName, fieldName, conversationPipelineResolver);

    const assistantResponsePipelineResolver = generateResolverPipeline(ASSISTANT_RESPONSE_PIPELINE, directive);
    ctx.resolvers.addResolver(parentName, directive.assistantResponseMutation.field.name.value, assistantResponsePipelineResolver);

    const assistantResponseSubscriptionPipelineResolver = generateResolverPipeline(ASSISTANT_RESPONSE_SUBSCRIPTION_PIPELINE, directive);
    ctx.resolvers.addResolver(
      'Subscription',
      directive.assistantResponseSubscriptionField.name.value,
      assistantResponseSubscriptionPipelineResolver,
    );
  }

  /**
   * Creates a function stack for the conversation directive
   * @param ctx - The transformer context provider
   * @param capitalizedFieldName - The capitalized field name
   * @returns The created stack
   */
  private createFunctionStack(ctx: TransformerContextProvider, capitalizedFieldName: string): cdk.Stack {
    return ctx.stackManager.createStack(`${capitalizedFieldName}ConversationDirectiveLambdaStack`);
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
    if (directive.functionName) {
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
    aiModel: string,
  ): { functionDataSourceId: string; referencedFunction: IFunction } {
    const defaultConversationHandler = new conversation.ConversationHandlerFunction(
      functionStack,
      `${capitalizedFieldName}DefaultConversationHandler`,
      {
        models: [
          {
            modelId: aiModel,
          },
        ],
      },
    );

    const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(`${capitalizedFieldName}DefaultConversationHandler`);
    const referencedFunction = defaultConversationHandler.resources.lambda;

    return { functionDataSourceId, referencedFunction };
  }

  /**
   * Adds a Lambda data source to the API
   * @param ctx - The transformer context provider
   * @param functionDataSourceId - The function data source ID
   * @param referencedFunction - The referenced Lambda function
   * @param capitalizedFieldName - The capitalized field name
   * @returns The created function data source
   */
  private addLambdaDataSource(
    ctx: TransformerContextProvider,
    functionDataSourceId: string,
    referencedFunction: IFunction,
    capitalizedFieldName: string,
  ): any {
    const functionDataSourceScope = ctx.stackManager.getScopeFor(
      functionDataSourceId,
      `${capitalizedFieldName}ConversationDirectiveLambdaStack`,
    );
    return ctx.api.host.addLambdaDataSource(functionDataSourceId, referencedFunction, {}, functionDataSourceScope);
  }

  private addInitSlotToListMessagesPipeline(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const messageModelName = directive.messageModel.messageModel.name.value;
    const pluralized = pluralize(messageModelName);
    const listMessagesResolver = ctx.resolvers.getResolver('Query', `list${pluralized}`) as TransformerResolver;
    const initResolverFn = generateResolverFunction(LIST_MESSAGES_INIT_FUNCTION, directive);
    listMessagesResolver.addJsFunctionToSlot('init', initResolverFn);
  }

  /**
   * Sets up the message table index
   * @param ctx - The transformer context provider
   * @param directive - The conversation directive configuration
   */
  private setupMessageTableIndex(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const messageModelName = directive.messageModel.messageModel.name.value;
    const referenceFieldName = 'conversationId';
    const messageModel = directive.messageModel.messageModel;

    const conversationMessagesTable = getTable(ctx, messageModel);
    const gsiPartitionKeyName = referenceFieldName;
    const gsiPartitionKeyType = 'S';
    const gsiSortKeyName = 'createdAt';
    const gsiSortKeyType = 'S';
    const indexName = 'gsi-ConversationMessage.conversationId.createdAt';

    this.addGlobalSecondaryIndex(
      conversationMessagesTable,
      indexName,
      { name: gsiPartitionKeyName, type: gsiPartitionKeyType },
      { name: gsiSortKeyName, type: gsiSortKeyType },
      ctx,
      messageModelName,
    );
  }

  private addGlobalSecondaryIndex(
    table: any,
    indexName: string,
    partitionKey: KeyAttributeDefinition,
    sortKey: KeyAttributeDefinition,
    ctx: TransformerContextProvider,
    typeName: string,
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
