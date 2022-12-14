import {
  MappingTemplate,
  SyncConfig,
  SyncUtils,
  TransformerNestedStack,
} from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncDataSourceType,
  MutationFieldType,
  QueryFieldType,
  SubscriptionFieldType,
  TransformerBeforeStepContextProvider,
  TransformerContextProvider,
  TransformerModelProvider,
  TransformerPrepareStepContextProvider,
  TransformerResolverProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  AttributeType,
  CfnTable,
  StreamViewType,
  Table,
  TableEncryption,
} from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import { CfnRole } from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { CfnDataSource } from '@aws-cdk/aws-appsync';
import {
  ObjectTypeDefinitionNode,
} from 'graphql';
import {
  makeDirective,
  ModelResourceIDs,
  ResourceConstants,
  SyncResourceIDs,
} from 'graphql-transformer-common';
import {
  addDirectivesToOperation,
  addModelConditionInputs,
  extendTypeWithDirectives,
  propagateApiKeyToNestedTypes,
  generateAuthExpressionForSandboxMode,
  generateDefaultResponseMappingTemplate,
  generateResolverKey,
  GenericModelTransformer,
  API_KEY_DIRECTIVE,
  directiveDefinition as modelDefinition
} from '@aws-amplify/graphql-base-model-transformer';
import {
  generateCreateInitSlotTemplate,
  generateCreateRequestTemplate,
  generateDeleteRequestTemplate,
  generateUpdateInitSlotTemplate,
  generateUpdateRequestTemplate,
} from './resolvers';
import {
  generateGetRequestTemplate,
  generateGetResponseTemplate,
  generateListRequestTemplate,
  generateSyncRequestTemplate,
} from './resolvers/query';
import { ModelDirectiveConfiguration, SubscriptionLevel } from './directive';

/**
 * Nullable
 */
export type Nullable<T> = T | null;

export const directiveDefinition = modelDefinition;

type ModelTransformerOptions = {
  EnableDeletionProtection?: boolean;
  SyncConfig?: SyncConfig;
};

/**
 * ModelTransformer
 */
export class ModelTransformer extends GenericModelTransformer implements TransformerModelProvider {
  constructor(options: ModelTransformerOptions = {}) {
    super('amplify-model-transformer', directiveDefinition);
    this.options = this.getOptions(options);
  }

  before = (ctx: TransformerBeforeStepContextProvider): void => {
    // add model related-parameters to the root stack
    ctx.stackManager.addParameter(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS, {
      description: 'The number of read IOPS the table should support.',
      type: 'Number',
      default: 5,
    });
    ctx.stackManager.addParameter(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS, {
      description: 'The number of write IOPS the table should support.',
      type: 'Number',
      default: 5,
    });
    ctx.stackManager.addParameter(ResourceConstants.PARAMETERS.DynamoDBBillingMode, {
      description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
      default: 'PAY_PER_REQUEST',
      allowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
    });
    ctx.stackManager.addParameter(ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery, {
      description: 'Whether to enable Point in Time Recovery on the table.',
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
    });
    ctx.stackManager.addParameter(ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption, {
      description: 'Enable server side encryption powered by KMS.',
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
    });
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    this.typesWithModelDirective.forEach(type => {
      const def = context.output.getObject(type)!;
      // This name is used by the mock functionality. Changing this can break mock.
      const tableBaseName = context.resourceHelper.getModelNameMapping(def!.name.value);
      const tableLogicalName = ModelResourceIDs.ModelTableResourceID(tableBaseName);
      const stack = context.stackManager.getStackFor(tableLogicalName, tableBaseName);

      this.createModelTable(stack, def!, context);

      const queryFields = this.getQueryFieldNames(def!);
      queryFields.forEach(query => {
        let resolver;
        switch (query.type) {
          case QueryFieldType.GET:
            resolver = this.generateGetResolver(context, def!, query.typeName, query.fieldName, query.resolverLogicalId);
            break;
          case QueryFieldType.LIST:
            resolver = this.generateListResolver(context, def!, query.typeName, query.fieldName, query.resolverLogicalId);
            break;
          case QueryFieldType.SYNC:
            resolver = this.generateSyncResolver(context, def!, query.typeName, query.fieldName, query.resolverLogicalId);
            break;
          default:
            throw new Error('Unknown query field type');
        }
        // TODO: add mechanism to add an auth like rule to all non auth @models
        // this way we can just depend on auth to add the check
        resolver.addToSlot(
          'postAuth',
          MappingTemplate.s3MappingTemplateFromString(
            generateAuthExpressionForSandboxMode(context.sandboxModeEnabled),
            `${query.typeName}.${query.fieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
        resolver.mapToStack(context.stackManager.getStackFor(query.resolverLogicalId, def!.name.value));
        context.resolvers.addResolver(query.typeName, query.fieldName, resolver);
      });

      const mutationFields = this.getMutationFieldNames(def!);
      mutationFields.forEach(mutation => {
        let resolver;
        switch (mutation.type) {
          case MutationFieldType.CREATE:
            resolver = this.generateCreateResolver(context, def!, mutation.typeName, mutation.fieldName, mutation.resolverLogicalId);
            break;
          case MutationFieldType.DELETE:
            resolver = this.generateDeleteResolver(context, def!, mutation.typeName, mutation.fieldName, mutation.resolverLogicalId);
            break;
          case MutationFieldType.UPDATE:
            resolver = this.generateUpdateResolver(context, def!, mutation.typeName, mutation.fieldName, mutation.resolverLogicalId);
            break;
          default:
            throw new Error('Unknown mutation field type');
        }
        resolver.addToSlot(
          'postAuth',
          MappingTemplate.s3MappingTemplateFromString(
            generateAuthExpressionForSandboxMode(context.sandboxModeEnabled),
            `${mutation.typeName}.${mutation.fieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
        resolver.mapToStack(context.stackManager.getStackFor(mutation.resolverLogicalId, def!.name.value));
        context.resolvers.addResolver(mutation.typeName, mutation.fieldName, resolver);
      });

      const subscriptionLevel = this.modelDirectiveConfig.get(def.name.value)?.subscriptions?.level;
      // in order to create subscription resolvers the level needs to be on
      if (subscriptionLevel !== SubscriptionLevel.off) {
        const subscriptionFields = this.getSubscriptionFieldNames(def!);
        subscriptionFields.forEach(subscription => {
          let resolver;
          switch (subscription.type) {
            case SubscriptionFieldType.ON_CREATE:
              resolver = this.generateOnCreateResolver(
                context,
                subscription.typeName,
                subscription.fieldName,
                subscription.resolverLogicalId,
              );
              break;
            case SubscriptionFieldType.ON_UPDATE:
              resolver = this.generateOnUpdateResolver(
                context,
                subscription.typeName,
                subscription.fieldName,
                subscription.resolverLogicalId,
              );
              break;
            case SubscriptionFieldType.ON_DELETE:
              resolver = this.generateOnDeleteResolver(
                context,
                subscription.typeName,
                subscription.fieldName,
                subscription.resolverLogicalId,
              );
              break;
            default:
              throw new Error('Unknown subscription field type');
          }
          if (subscriptionLevel === SubscriptionLevel.on) {
            resolver.addToSlot(
              'postAuth',
              MappingTemplate.s3MappingTemplateFromString(
                generateAuthExpressionForSandboxMode(context.sandboxModeEnabled),
                `${subscription.typeName}.${subscription.fieldName}.{slotName}.{slotIndex}.req.vtl`,
              ),
            );
          }
          resolver.mapToStack(context.stackManager.getStackFor(subscription.resolverLogicalId, def!.name.value));
          context.resolvers.addResolver(subscription.typeName, subscription.fieldName, resolver);
        });
      }
    });
  };

  generateGetResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(generateGetRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(generateGetResponseTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateListResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `List${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(generateListRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          generateDefaultResponseMappingTemplate(isSyncEnabled),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateUpdateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Update${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      const resolver = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          generateUpdateRequestTemplate(typeName, isSyncEnabled),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          generateDefaultResponseMappingTemplate(isSyncEnabled, true),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
      // Todo: get the slot index from the resolver to keep the name unique and show the order of functions
      resolver.addToSlot(
        'init',
        MappingTemplate.s3MappingTemplateFromString(
          generateUpdateInitSlotTemplate(this.modelDirectiveConfig.get(type.name.value)!),
          `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`,
        ),
      );
      this.resolverMap[resolverKey] = resolver;
    }
    return this.resolverMap[resolverKey];
  };

  generateDeleteResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `delete${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(generateDeleteRequestTemplate(isSyncEnabled), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          generateDefaultResponseMappingTemplate(isSyncEnabled, true),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateSyncResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Sync${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(generateSyncRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          generateDefaultResponseMappingTemplate(isSyncEnabled),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  getDataSourceType = (): AppSyncDataSourceType => AppSyncDataSourceType.AMAZON_DYNAMODB;

  generateCreateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Create${generateResolverKey(typeName, fieldName)}`;
    const modelIndexFields = type.fields!.filter(field => field.directives?.some(it => it.name.value === 'index')).map(it => it.name.value);
    if (!this.resolverMap[resolverKey]) {
      const resolver = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(generateCreateRequestTemplate(type.name.value, modelIndexFields), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          generateDefaultResponseMappingTemplate(isSyncEnabled, true),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
      this.resolverMap[resolverKey] = resolver;
      resolver.addToSlot(
        'init',
        MappingTemplate.s3MappingTemplateFromString(
          generateCreateInitSlotTemplate(this.modelDirectiveConfig.get(type.name.value)!),
          `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  private createModelTable(stack: cdk.Stack, def: ObjectTypeDefinitionNode, context: TransformerContextProvider): void {
    const tableLogicalName = ModelResourceIDs.ModelTableResourceID(def!.name.value);
    const tableName = context.resourceHelper.generateTableName(def!.name.value);

    // Add parameters.
    const env = context.stackManager.getParameter(ResourceConstants.PARAMETERS.Env) as cdk.CfnParameter;
    const readIops = new cdk.CfnParameter(stack, ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS, {
      description: 'The number of read IOPS the table should support.',
      type: 'Number',
      default: 5,
    });
    const writeIops = new cdk.CfnParameter(stack, ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS, {
      description: 'The number of write IOPS the table should support.',
      type: 'Number',
      default: 5,
    });
    const billingMode = new cdk.CfnParameter(stack, ResourceConstants.PARAMETERS.DynamoDBBillingMode, {
      description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
      type: 'String',
      default: 'PAY_PER_REQUEST',
      allowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
    });
    const pointInTimeRecovery = new cdk.CfnParameter(stack, ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery, {
      description: 'Whether to enable Point in Time Recovery on the table.',
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
    });
    const enableSSE = new cdk.CfnParameter(stack, ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption, {
      description: 'Enable server side encryption powered by KMS.',
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
    });
    // add the connection between the root and nested stack so the values can be passed down
    (stack as TransformerNestedStack).setParameter(readIops.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS));
    (stack as TransformerNestedStack).setParameter(writeIops.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS));
    (stack as TransformerNestedStack).setParameter(billingMode.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBBillingMode));
    (stack as TransformerNestedStack).setParameter(
      pointInTimeRecovery.node.id,
      cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery),
    );
    (stack as TransformerNestedStack).setParameter(
      enableSSE.node.id,
      cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption),
    );

    // Add conditions.
    // eslint-disable-next-line no-new
    new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(env, ResourceConstants.NONE)),
    });
    const useSSE = new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.ShouldUseServerSideEncryption, {
      expression: cdk.Fn.conditionEquals(enableSSE, 'true'),
    });
    const usePayPerRequestBilling = new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, {
      expression: cdk.Fn.conditionEquals(billingMode, 'PAY_PER_REQUEST'),
    });
    const usePointInTimeRecovery = new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.ShouldUsePointInTimeRecovery, {
      expression: cdk.Fn.conditionEquals(pointInTimeRecovery, 'true'),
    });

    const removalPolicy = this.options.EnableDeletionProtection ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // Expose a way in context to allow proper resource naming
    const table = new Table(stack, tableLogicalName, {
      tableName,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: TableEncryption.DEFAULT,
      removalPolicy,
      ...(context.isProjectUsingDataStore() ? { timeToLiveAttribute: '_ttl' } : undefined),
    });
    const cfnTable = table.node.defaultChild as CfnTable;

    cfnTable.provisionedThroughput = cdk.Fn.conditionIf(usePayPerRequestBilling.logicalId, cdk.Fn.ref('AWS::NoValue'), {
      ReadCapacityUnits: readIops,
      WriteCapacityUnits: writeIops,
    });
    cfnTable.pointInTimeRecoverySpecification = cdk.Fn.conditionIf(
      usePointInTimeRecovery.logicalId,
      { PointInTimeRecoveryEnabled: true },
      cdk.Fn.ref('AWS::NoValue'),
    );
    cfnTable.billingMode = cdk.Fn.conditionIf(usePayPerRequestBilling.logicalId, 'PAY_PER_REQUEST', cdk.Fn.ref('AWS::NoValue')).toString();
    cfnTable.sseSpecification = {
      sseEnabled: cdk.Fn.conditionIf(useSSE.logicalId, true, false),
    };

    const streamArnOutputId = `GetAtt${ModelResourceIDs.ModelTableStreamArn(def!.name.value)}`;
    // eslint-disable-next-line no-new
    new cdk.CfnOutput(stack, streamArnOutputId, {
      value: cdk.Fn.getAtt(tableLogicalName, 'StreamArn').toString(),
      description: 'Your DynamoDB table StreamArn.',
      exportName: cdk.Fn.join(':', [context.api.apiId, 'GetAtt', tableLogicalName, 'StreamArn']),
    });

    const tableNameOutputId = `GetAtt${tableLogicalName}Name`;
    // eslint-disable-next-line no-new
    new cdk.CfnOutput(stack, tableNameOutputId, {
      value: cdk.Fn.ref(tableLogicalName),
      description: 'Your DynamoDB table name.',
      exportName: cdk.Fn.join(':', [context.api.apiId, 'GetAtt', tableLogicalName, 'Name']),
    });

    const role = this.createIAMRole(context, def, stack, tableName);
    const tableDataSourceLogicalName = `${def!.name.value}Table`;
    this.createModelTableDataSource(def, context, table, stack, role, tableDataSourceLogicalName);
  }

  private createModelTableDataSource(
    def: ObjectTypeDefinitionNode,
    context: TransformerContextProvider,
    table: Table,
    stack: cdk.Stack,
    role: iam.Role,
    dataSourceLogicalName: string,
  ): void {
    const datasourceRoleLogicalID = ModelResourceIDs.ModelTableDataSourceID(def!.name.value);
    const dataSource = context.api.host.addDynamoDbDataSource(
      datasourceRoleLogicalID,
      table,
      { name: dataSourceLogicalName, serviceRole: role },
      stack,
    );

    const cfnDataSource = dataSource.node.defaultChild as CfnDataSource;
    cfnDataSource.addDependsOn(role.node.defaultChild as CfnRole);

    if (context.isProjectUsingDataStore()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const datasourceDynamoDb = cfnDataSource.dynamoDbConfig as any;
      datasourceDynamoDb.deltaSyncConfig = {
        deltaSyncTableName: context.resourceHelper.generateTableName(SyncResourceIDs.syncTableName),
        deltaSyncTableTtl: '30',
        baseTableTtl: '43200',
      };
      datasourceDynamoDb.versioned = true;
    }

    const datasourceOutputId = `GetAtt${datasourceRoleLogicalID}Name`;
    // eslint-disable-next-line no-new
    new cdk.CfnOutput(stack, datasourceOutputId, {
      value: dataSource.ds.attrName,
      description: 'Your model DataSource name.',
      exportName: cdk.Fn.join(':', [context.api.apiId, 'GetAtt', datasourceRoleLogicalID, 'Name']),
    });

    // add the data source
    context.dataSources.add(def!, dataSource);
    this.datasourceMap[def!.name.value] = dataSource;
  }

  /**
   * createIAMRole
   */
  createIAMRole = (context: TransformerContextProvider, def: ObjectTypeDefinitionNode, stack: cdk.Stack, tableName: string): iam.Role => {
    const roleName = context.resourceHelper.generateIAMRoleName(ModelResourceIDs.ModelTableIAMRoleID(def!.name.value));
    const role = new iam.Role(stack, ModelResourceIDs.ModelTableIAMRoleID(def!.name.value), {
      roleName,
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
    });

    const amplifyDataStoreTableName = context.resourceHelper.generateTableName(SyncResourceIDs.syncTableName);
    role.attachInlinePolicy(
      new iam.Policy(stack, 'DynamoDBAccess', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'dynamodb:BatchGetItem',
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:DeleteItem',
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:Query',
              'dynamodb:UpdateItem',
            ],
            resources: [
              // eslint-disable-next-line no-template-curly-in-string
              cdk.Fn.sub('arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}', {
                tablename: tableName,
              }),
              // eslint-disable-next-line no-template-curly-in-string
              cdk.Fn.sub('arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}/*', {
                tablename: tableName,
              }),
              ...(context.isProjectUsingDataStore()
                ? [
                  // eslint-disable-next-line no-template-curly-in-string
                  cdk.Fn.sub('arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}', {
                    tablename: amplifyDataStoreTableName,
                  }),
                  // eslint-disable-next-line no-template-curly-in-string
                  cdk.Fn.sub('arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}/*', {
                    tablename: amplifyDataStoreTableName,
                  }),
                ]
                : []),
            ],
          }),
        ],
      }),
    );

    const syncConfig = SyncUtils.getSyncConfig(context, def!.name.value);
    if (syncConfig && SyncUtils.isLambdaSyncConfig(syncConfig)) {
      role.attachInlinePolicy(
        SyncUtils.createSyncLambdaIAMPolicy(context, stack, syncConfig.LambdaConflictHandler.name, syncConfig.LambdaConflictHandler.region),
      );
    }

    return role;
  }
}
