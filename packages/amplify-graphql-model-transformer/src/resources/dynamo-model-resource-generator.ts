import * as cdk from 'aws-cdk-lib';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceIDs, ResourceConstants, SyncResourceIDs } from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode } from 'graphql';
import { SyncUtils, setResourceName } from '@aws-amplify/graphql-transformer-core';
import { AttributeType, CfnTable, ITable, StreamViewType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { CfnDataSource } from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DynamoDBModelVTLGenerator, ModelVTLGenerator } from '../resolvers';
import { ModelResourceGenerator } from './model-resource-generator';

/**
 * DynamoModelResourceGenerator is an implementation of ModelResourceGenerator,
 * providing necessary utilities to generate the DynamoDB resources for models
 */
export class DynamoModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'DynamoModelResourceGenerator';

  generateResources(ctx: TransformerContextProvider): void {
    if (!this.isEnabled()) {
      return;
    }

    if (this.isProvisioned()) {
      // add model related-parameters to the root stack
      const rootStack = cdk.Stack.of(ctx.stackManager.scope);
      this.createDynamoDBParameters(rootStack, false);
    }

    this.models.forEach((model) => {
      // This name is used by the mock functionality. Changing this can break mock.
      const tableBaseName = ctx.resourceHelper.getModelNameMapping(model!.name.value);
      const tableLogicalName = ModelResourceIDs.ModelTableResourceID(tableBaseName);
      const scope = ctx.stackManager.getScopeFor(tableLogicalName, tableBaseName);

      this.createModelTable(scope, model, ctx);
    });

    this.generateResolvers(ctx);
  }

  // eslint-disable-next-line class-methods-use-this
  getVTLGenerator(): ModelVTLGenerator {
    return new DynamoDBModelVTLGenerator();
  }

  protected createModelTable(scope: Construct, def: ObjectTypeDefinitionNode, context: TransformerContextProvider): void {
    const modelName = def!.name.value;
    const tableLogicalName = ModelResourceIDs.ModelTableResourceID(modelName);
    const tableName = context.resourceHelper.generateTableName(modelName);

    // Add parameters.
    const { readIops, writeIops, billingMode, pointInTimeRecovery, enableSSE } = this.createDynamoDBParameters(scope, true);

    // Add conditions.
    new cdk.CfnCondition(scope, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(context.synthParameters.amplifyEnvironmentName, ResourceConstants.NONE)),
    });
    const useSSE = new cdk.CfnCondition(scope, ResourceConstants.CONDITIONS.ShouldUseServerSideEncryption, {
      expression: cdk.Fn.conditionEquals(enableSSE, 'true'),
    });
    const usePayPerRequestBilling = new cdk.CfnCondition(scope, ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, {
      expression: cdk.Fn.conditionEquals(billingMode, 'PAY_PER_REQUEST'),
    });
    const usePointInTimeRecovery = new cdk.CfnCondition(scope, ResourceConstants.CONDITIONS.ShouldUsePointInTimeRecovery, {
      expression: cdk.Fn.conditionEquals(pointInTimeRecovery, 'true'),
    });

    const removalPolicy =
      this.options.EnableDeletionProtection || context.transformParameters.enableGen2Migration
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY;

    // Expose a way in context to allow proper resource naming
    const table = new Table(scope, tableLogicalName, {
      tableName,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: TableEncryption.DEFAULT,
      removalPolicy,
      deletionProtection: context.transformParameters.enableGen2Migration,
      ...(context.isProjectUsingDataStore() ? { timeToLiveAttribute: '_ttl' } : undefined),
    });
    const cfnTable = table.node.defaultChild as CfnTable;
    setResourceName(table, { name: modelName, setOnDefaultChild: true });

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

    if (context.transformParameters.enableTransformerCfnOutputs) {
      if (table.tableStreamArn) {
        const streamArnOutputId = `GetAtt${ModelResourceIDs.ModelTableStreamArn(def!.name.value)}`;
        new cdk.CfnOutput(cdk.Stack.of(scope), streamArnOutputId, {
          value: table.tableStreamArn,
          description: 'Your DynamoDB table StreamArn.',
          exportName: cdk.Fn.join(':', [context.api.apiId, 'GetAtt', tableLogicalName, 'StreamArn']),
        });
      }

      const tableNameOutputId = `GetAtt${tableLogicalName}Name`;
      new cdk.CfnOutput(cdk.Stack.of(scope), tableNameOutputId, {
        value: table.tableName,
        description: 'Your DynamoDB table name.',
        exportName: cdk.Fn.join(':', [context.api.apiId, 'GetAtt', tableLogicalName, 'Name']),
      });
    }

    const role = this.createIAMRole(context, def, scope, tableName);
    const tableDataSourceLogicalName = `${def!.name.value}Table`;
    this.createModelTableDataSource(def, context, table, scope, role, tableDataSourceLogicalName);
  }

  protected createModelTableDataSource(
    def: ObjectTypeDefinitionNode,
    context: TransformerContextProvider,
    table: ITable,
    scope: Construct,
    role: iam.IRole,
    dataSourceLogicalName: string,
  ): void {
    const datasourceRoleLogicalID = ModelResourceIDs.ModelTableDataSourceID(def!.name.value);
    const dataSource = context.api.host.addDynamoDbDataSource(
      datasourceRoleLogicalID,
      table,
      { name: dataSourceLogicalName, serviceRole: role },
      scope,
    );

    const cfnDataSource = dataSource.node.defaultChild as CfnDataSource;
    cfnDataSource.addDependency(role.node.defaultChild as CfnRole);

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

    if (context.transformParameters.enableTransformerCfnOutputs) {
      const datasourceOutputId = `GetAtt${datasourceRoleLogicalID}Name`;
      new cdk.CfnOutput(cdk.Stack.of(scope), datasourceOutputId, {
        value: dataSource.ds.attrName,
        description: 'Your model DataSource name.',
        exportName: cdk.Fn.join(':', [context.api.apiId, 'GetAtt', datasourceRoleLogicalID, 'Name']),
      });
    }

    // add the data source
    context.dataSources.add(def!, dataSource);
    this.datasourceMap[def!.name.value] = dataSource;
  }

  protected createDynamoDBParameters(scope: Construct, isNestedStack: boolean): Record<string, cdk.CfnParameter> {
    const readIops =
      (scope.node.tryFindChild(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS) as cdk.CfnParameter) ??
      new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS, {
        description: 'The number of read IOPS the table should support.',
        type: 'Number',
        default: 5,
      });
    const writeIops =
      (scope.node.tryFindChild(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS) as cdk.CfnParameter) ??
      new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS, {
        description: 'The number of write IOPS the table should support.',
        type: 'Number',
        default: 5,
      });
    const billingMode =
      (scope.node.tryFindChild(ResourceConstants.PARAMETERS.DynamoDBBillingMode) as cdk.CfnParameter) ??
      new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBBillingMode, {
        description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
        type: 'String',
        default: 'PAY_PER_REQUEST',
        allowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
      });
    const pointInTimeRecovery =
      (scope.node.tryFindChild(ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery) as cdk.CfnParameter) ??
      new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery, {
        description: 'Whether to enable Point in Time Recovery on the table.',
        type: 'String',
        default: 'false',
        allowedValues: ['true', 'false'],
      });
    const enableSSE =
      (scope.node.tryFindChild(ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption) as cdk.CfnParameter) ??
      new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption, {
        description: 'Enable server side encryption powered by KMS.',
        type: 'String',
        default: 'true',
        allowedValues: ['true', 'false'],
      });

    if (isNestedStack) {
      // add the connection between the root and nested stack so the values can be passed down
      (scope as cdk.NestedStack).setParameter(readIops.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS));
      (scope as cdk.NestedStack).setParameter(writeIops.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS));
      (scope as cdk.NestedStack).setParameter(billingMode.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBBillingMode));
      (scope as cdk.NestedStack).setParameter(
        pointInTimeRecovery.node.id,
        cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery),
      );
      (scope as cdk.NestedStack).setParameter(
        enableSSE.node.id,
        cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption),
      );
    }

    return {
      readIops,
      writeIops,
      billingMode,
      pointInTimeRecovery,
      enableSSE,
    };
  }

  /**
   * Create a role, assumable by AppSync, with a policy statement named `DynamoDBAccess`. Policy actions are scoped to the table named
   * according to Amplify's default convention (`{modelName}-{apiId}-{envName}`).
   *
   * In most cases, this will duplicate the `...IAMRoleDefaultPolicy` that is automatically generated by the AppSync CDK's
   * `addDynamoDbDataSource` API in {@link createModelTableDataSource}. We create it anyway for 3 reasons:
   *
   * 1. The `...IAMRoleDefaultPolicy` respects [table name
   *    overrides](https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/modify-amplify-generated-resources/#customize-amplify-generated-resources-for-model-directive).
   *    Overrides are not available to us during creation of this role.
   * 2. The `DynamoDBAccess` policy is exposed as an Amplify-generated resource for overrides. Existing customers may be using this and
   *    depending on the policy statements
   * 3. The `DynamoDBAccess` policy includes statements enabling Lambda sync flows, if enabled. Note that the sync policy does not rely on
   *    table name, so it does not need to be aware of table name overrides.
   */
  createIAMRole = (context: TransformerContextProvider, def: ObjectTypeDefinitionNode, scope: Construct, tableName: string): iam.IRole => {
    const roleName = context.resourceHelper.generateIAMRoleName(ModelResourceIDs.ModelTableIAMRoleID(def!.name.value));
    const amplifyDataStoreTableName = context.resourceHelper.generateTableName(SyncResourceIDs.syncTableName);
    const role = new iam.Role(scope, ModelResourceIDs.ModelTableIAMRoleID(def!.name.value), {
      roleName,
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      // Use an inline policy here to prevent unnecessary policy CloudFormation resources from being generated. Note that CDK will still
      // create a CFN resource for `<modelName>IAMRoleDefaultPolicy`
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
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
                'dynamodb:ConditionCheckItem',
                'dynamodb:DescribeTable',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
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
      },
    });
    setResourceName(role, { name: ModelResourceIDs.ModelTableIAMRoleID(def!.name.value), setOnDefaultChild: true });

    const syncConfig = SyncUtils.getSyncConfig(context, def!.name.value);
    if (syncConfig && SyncUtils.isLambdaSyncConfig(syncConfig)) {
      role.attachInlinePolicy(
        SyncUtils.createSyncLambdaIAMPolicy(context, scope, syncConfig.LambdaConflictHandler.name, syncConfig.LambdaConflictHandler.region),
      );
    }

    return role;
  };
}
