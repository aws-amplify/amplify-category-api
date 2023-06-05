import * as cdk from 'aws-cdk-lib';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  ModelResourceIDs,
  ResourceConstants,
  SyncResourceIDs,
} from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode } from 'graphql';
import { SyncUtils, TransformerNestedStack } from '@aws-amplify/graphql-transformer-core';
import {
  AttributeType,
  CfnTable,
  StreamViewType,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { CfnDataSource } from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { ModelResourceGenerator } from './model-resource-generator';
import { DynamoDBModelVTLGenerator, ModelVTLGenerator } from '../resolvers';

/**
 * DynamoModelResourceGenerator is an implementation of ModelResourceGenerator,
 * providing necessary utilities to generate the DynamoDB resources for models
 */
export class DynamoModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'DynamoModelResourceGenerator';

  /**
   *
   * @param ctx
   */
  generateResources(ctx: TransformerContextProvider): void {
    if (!this.isEnabled()) {
      return;
    }

    if (this.isProvisioned()) {
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
    }

    this.models.forEach((model) => {
      // This name is used by the mock functionality. Changing this can break mock.
      const tableBaseName = ctx.resourceHelper.getModelNameMapping(model!.name.value);
      const tableLogicalName = ModelResourceIDs.ModelTableResourceID(tableBaseName);
      const stack = ctx.stackManager.getStackFor(tableLogicalName, tableBaseName);

      this.createModelTable(stack, model, ctx);
    });

    this.generateResolvers(ctx);
  }

  // eslint-disable-next-line class-methods-use-this
  /**
   *
   */
  getVTLGenerator(): ModelVTLGenerator {
    return new DynamoDBModelVTLGenerator();
  }

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
   * @param context
   * @param def
   * @param stack
   * @param tableName
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
  };
}
