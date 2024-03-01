import * as cdk from 'aws-cdk-lib';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode } from 'graphql';
import { setResourceName } from '@aws-amplify/graphql-transformer-core';
import { AttributeType, StreamViewType, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { Duration, aws_iam, aws_lambda, custom_resources, aws_logs } from 'aws-cdk-lib';
import { DynamoModelResourceGenerator } from '../dynamo-model-resource-generator';
import * as path from 'path';
import { AmplifyDynamoDBTable } from './amplify-dynamodb-table-construct';

/**
 * AmplifyDynamoModelResourceGenerator is a subclass of DynamoModelResourceGenerator,
 * provisioning the DynamoDB tables with the custom resource instead of pre-defined DynamoDB table CFN template
 */

export const ITERATIVE_TABLE_STACK_NAME = 'AmplifyTableManager';
export class AmplifyDynamoModelResourceGenerator extends DynamoModelResourceGenerator {
  private customResourceServiceToken: string = '';
  private ddbManagerPolicy?: aws_iam.Policy;

  generateResources(ctx: TransformerContextProvider): void {
    if (!this.isEnabled()) {
      return;
    }

    if (this.isProvisioned()) {
      // add model related-parameters to the root stack
      const rootStack = cdk.Stack.of(ctx.stackManager.scope);
      this.createDynamoDBParameters(rootStack, false);

      const tableManagerStack = ctx.stackManager.getScopeFor('AmplifyTableCustomProvider', ITERATIVE_TABLE_STACK_NAME);
      this.createCustomProviderResource(tableManagerStack, ctx);
    }

    this.models.forEach((model) => {
      // This name is used by the mock functionality. Changing this can break mock.
      const tableBaseName = ctx.resourceHelper.getModelNameMapping(model!.name.value);
      const tableLogicalName = ModelResourceIDs.ModelTableResourceID(tableBaseName);
      const scope = ctx.stackManager.getScopeFor(tableLogicalName, tableBaseName);

      this.createModelTable(scope, model, ctx);
    });

    if (this.ddbManagerPolicy) {
      this.ddbManagerPolicy?.addStatements(
        new aws_iam.PolicyStatement({
          actions: [
            'dynamodb:CreateTable',
            'dynamodb:UpdateTable',
            'dynamodb:DeleteTable',
            'dynamodb:DescribeTable',
            'dynamodb:DescribeContinuousBackups',
            'dynamodb:DescribeTimeToLive',
            'dynamodb:UpdateContinuousBackups',
            'dynamodb:UpdateTimeToLive',
          ],
          resources: [
            cdk.Fn.sub('arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/*-${apiId}-${envName}', {
              apiId: ctx.api.apiId,
              envName: ctx.synthParameters.amplifyEnvironmentName,
            }),
          ],
        }),
      );
    }

    this.generateResolvers(ctx);
  }

  protected createCustomProviderResource(scope: Construct, context: TransformerContextProvider): void {
    // Policy that grants access to Create/Update/Delete DynamoDB tables
    this.ddbManagerPolicy = new aws_iam.Policy(scope, 'CreateUpdateDeleteTablesPolicy');

    const lambdaCode = aws_lambda.Code.fromAsset(
      path.join(__dirname, '..', '..', '..', 'lib', 'resources', 'amplify-dynamodb-table', 'amplify-table-manager-lambda'),
    );

    // lambda that will handle DDB CFN events
    const gsiOnEventHandler = new aws_lambda.Function(scope, ResourceConstants.RESOURCES.TableManagerOnEventHandlerLogicalID, {
      runtime: aws_lambda.Runtime.NODEJS_18_X,
      code: lambdaCode,
      handler: 'amplify-table-manager-handler.onEvent',
      timeout: Duration.minutes(14),
    });

    // lambda that will poll for provisioning to complete
    const gsiIsCompleteHandler = new aws_lambda.Function(scope, ResourceConstants.RESOURCES.TableManagerIsCompleteHandlerLogicalID, {
      runtime: aws_lambda.Runtime.NODEJS_18_X,
      code: lambdaCode,
      handler: 'amplify-table-manager-handler.isComplete',
      timeout: Duration.minutes(14),
    });

    this.ddbManagerPolicy.attachToRole(gsiOnEventHandler.role!);
    this.ddbManagerPolicy.attachToRole(gsiIsCompleteHandler.role!);
    const customResourceProvider = new custom_resources.Provider(scope, ResourceConstants.RESOURCES.TableManagerCustomProviderLogicalID, {
      onEventHandler: gsiOnEventHandler,
      isCompleteHandler: gsiIsCompleteHandler,
      logRetention: aws_logs.RetentionDays.ONE_MONTH,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.hours(2),
    });
    this.customResourceServiceToken = customResourceProvider.serviceToken;
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

    const removalPolicy = this.options.EnableDeletionProtection ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // TODO: The attribute of encryption and TTL should be added
    const table = new AmplifyDynamoDBTable(scope, `${tableLogicalName}`, {
      customResourceServiceToken: this.customResourceServiceToken,
      allowDestructiveGraphqlSchemaUpdates: context.transformParameters.allowDestructiveGraphqlSchemaUpdates,
      replaceTableUponGsiUpdate: context.transformParameters.replaceTableUponGsiUpdate,
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
    setResourceName(table, { name: modelName, setOnDefaultChild: false });

    // construct a wrapper around the custom table to allow normal CDK operations on top of it
    const tableRepresentative = table.tableFromAttr;
    setResourceName(tableRepresentative, { name: modelName, setOnDefaultChild: false });

    const cfnTable = table.node.defaultChild?.node.defaultChild as cdk.CfnCustomResource;
    setResourceName(cfnTable, { name: modelName, setOnDefaultChild: false });
    cfnTable.addPropertyOverride(
      'provisionedThroughput',
      cdk.Fn.conditionIf(usePayPerRequestBilling.logicalId, cdk.Fn.ref('AWS::NoValue'), {
        ReadCapacityUnits: readIops,
        WriteCapacityUnits: writeIops,
      }),
    );
    cfnTable.addPropertyOverride(
      'pointInTimeRecoverySpecification',
      cdk.Fn.conditionIf(usePointInTimeRecovery.logicalId, { PointInTimeRecoveryEnabled: true }, cdk.Fn.ref('AWS::NoValue')),
    );
    cfnTable.addPropertyOverride(
      'billingMode',
      cdk.Fn.conditionIf(usePayPerRequestBilling.logicalId, 'PAY_PER_REQUEST', cdk.Fn.ref('AWS::NoValue')).toString(),
    );
    cfnTable.addPropertyOverride('sseSpecification', {
      sseEnabled: cdk.Fn.conditionIf(useSSE.logicalId, true, false),
    });

    const streamArnOutputId = `GetAtt${ModelResourceIDs.ModelTableStreamArn(def!.name.value)}`;
    if (table.tableStreamArn) {
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

    const role = this.createIAMRole(context, def, scope, tableName);
    const tableDataSourceLogicalName = `${def!.name.value}Table`;
    this.createModelTableDataSource(def, context, tableRepresentative, scope, role, tableDataSourceLogicalName);
  }
}
