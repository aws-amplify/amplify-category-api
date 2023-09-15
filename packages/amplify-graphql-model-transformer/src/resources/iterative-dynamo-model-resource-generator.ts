import * as cdk from 'aws-cdk-lib';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode } from 'graphql';
import { setResourceName } from '@aws-amplify/graphql-transformer-core';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { DynamoDBModelVTLGenerator, ModelVTLGenerator } from '../resolvers';

import { Duration, aws_iam, aws_lambda, custom_resources, aws_logs } from 'aws-cdk-lib';
import { CustomResource } from 'aws-cdk-lib';
import { DynamoModelResourceGenerator } from './dynamo-model-resource-generator';
import * as path from 'path';

export const ITERATIVE_TABLE_STACK_NAME = 'AmplifyTableManager';
export const CUSTOM_DDB_CFN_TYPE = 'Custom::AmplifyManagedDynamoDBTable';
/**
 * DynamoModelResourceGenerator is an implementation of ModelResourceGenerator,
 * providing necessary utilities to generate the DynamoDB resources for models
 */
export class IterativeDynamoModelResourceGenerator extends DynamoModelResourceGenerator {
  protected readonly generatorType = 'DynamoModelResourceGenerator';
  // Base path lambdas
  private customResourceServiceToken: string = '';

  generateResources(ctx: TransformerContextProvider): void {
    if (!this.isEnabled()) {
      return;
    }

    if (this.isProvisioned()) {
      // add model related-parameters to the root stack
      const rootStack = cdk.Stack.of(ctx.stackManager.scope);
      new cdk.CfnParameter(rootStack, ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS, {
        description: 'The number of read IOPS the table should support.',
        type: 'Number',
        default: 5,
      });
      new cdk.CfnParameter(rootStack, ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS, {
        description: 'The number of write IOPS the table should support.',
        type: 'Number',
        default: 5,
      });
      new cdk.CfnParameter(rootStack, ResourceConstants.PARAMETERS.DynamoDBBillingMode, {
        description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
        default: 'PAY_PER_REQUEST',
        allowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
      });
      new cdk.CfnParameter(rootStack, ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery, {
        description: 'Whether to enable Point in Time Recovery on the table.',
        type: 'String',
        default: 'false',
        allowedValues: ['true', 'false'],
      });
      new cdk.CfnParameter(rootStack, ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption, {
        description: 'Enable server side encryption powered by KMS.',
        type: 'String',
        default: 'true',
        allowedValues: ['true', 'false'],
      });

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

    this.generateResolvers(ctx);
  }

  createCustomProviderResource(scope: Construct, context: TransformerContextProvider): void {
    // Policy that grants access to Create/Update/Delete DynamoDB tables
    const ddbManagerPolicy = new aws_iam.Policy(scope, 'CreateUpdateDeleteTablesPolicy');
    ddbManagerPolicy.addStatements(
      new aws_iam.PolicyStatement({
        actions: ['dynamodb:CreateTable', 'dynamodb:UpdateTable', 'dynamodb:DeleteTable', 'dynamodb:DescribeTable'],
        // TODO: have more restricted scope
        resources: ['*'],
      }),
    );

    const lambdaCode = aws_lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lib', 'resources', 'custom-resource-lambda'));

    // lambda that will handle DDB CFN events
    const gsiOnEventHandler = new aws_lambda.Function(scope, ResourceConstants.RESOURCES.TableOnEventHandlerLogicalID, {
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: 'custom-resource-handler.onEvent',
      timeout: Duration.minutes(14),
    });

    // lambda that will poll for provisioning to complete
    const gsiIsCompleteHandler = new aws_lambda.Function(scope, ResourceConstants.RESOURCES.TableIsCompleteHandlerLogicalID, {
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: 'custom-resource-handler.isComplete',
      timeout: Duration.minutes(14),
    });

    ddbManagerPolicy.attachToRole(gsiOnEventHandler.role!);
    ddbManagerPolicy.attachToRole(gsiIsCompleteHandler.role!);
    const gsiCustomProvider = new custom_resources.Provider(scope, ResourceConstants.RESOURCES.TableCustomProviderLogicalID, {
      onEventHandler: gsiOnEventHandler,
      isCompleteHandler: gsiIsCompleteHandler,
      logRetention: aws_logs.RetentionDays.ONE_MONTH,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.hours(2),
    });
    this.customResourceServiceToken = gsiCustomProvider.serviceToken;
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
    const readIops = new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS, {
      description: 'The number of read IOPS the table should support.',
      type: 'Number',
      default: 5,
    });
    const writeIops = new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS, {
      description: 'The number of write IOPS the table should support.',
      type: 'Number',
      default: 5,
    });
    const billingMode = new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBBillingMode, {
      description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
      type: 'String',
      default: 'PAY_PER_REQUEST',
      allowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
    });
    const pointInTimeRecovery = new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery, {
      description: 'Whether to enable Point in Time Recovery on the table.',
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
    });
    const enableSSE = new cdk.CfnParameter(scope, ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption, {
      description: 'Enable server side encryption powered by KMS.',
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
    });
    // // add the connection between the root and nested stack so the values can be passed down
    (scope as cdk.NestedStack).setParameter(readIops.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS));
    (scope as cdk.NestedStack).setParameter(writeIops.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS));
    (scope as cdk.NestedStack).setParameter(billingMode.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBBillingMode));
    (scope as cdk.NestedStack).setParameter(
      pointInTimeRecovery.node.id,
      cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBEnablePointInTimeRecovery),
    );
    (scope as cdk.NestedStack).setParameter(enableSSE.node.id, cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBEnableServerSideEncryption));

    // // Add conditions.
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

    // TODO: The following lines for custom resource creation will be wrapped into a new internal construct
    // TODO: The attribute of encryption and TTL should be added
    const defaultTableState = {
      TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      StreamSpecification: {
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    };
    const tableResource = new CustomResource(scope, tableLogicalName, {
      serviceToken: this.customResourceServiceToken,
      resourceType: CUSTOM_DDB_CFN_TYPE,
      properties: {
        ...defaultTableState,
      },
      removalPolicy,
    });
    setResourceName(tableResource, { name: modelName, setOnDefaultChild: true });

    // construct a wrapper around the custom table to allow normal CDK operations on top of it
    const table = Table.fromTableAttributes(scope, `CustomTable${tableLogicalName}`, {
      tableArn: tableResource.getAttString('TableArn'),
      tableStreamArn: tableResource.getAttString('TableStreamArn'),
    });
    const cfnTable = tableResource.node.defaultChild as cdk.CfnCustomResource;

    cfnTable.addPropertyOverride(
      'ProvisonedThroughput',
      cdk.Fn.conditionIf(usePayPerRequestBilling.logicalId, cdk.Fn.ref('AWS::NoValue'), {
        ReadCapacityUnits: readIops,
        WriteCapacityUnits: writeIops,
      }),
    );
    cfnTable.addPropertyOverride(
      'PointInTimeRecoverySpecification',
      cdk.Fn.conditionIf(usePointInTimeRecovery.logicalId, { PointInTimeRecoveryEnabled: true }, cdk.Fn.ref('AWS::NoValue')),
    );
    cfnTable.addPropertyOverride(
      'BillingMode',
      cdk.Fn.conditionIf(usePayPerRequestBilling.logicalId, 'PAY_PER_REQUEST', cdk.Fn.ref('AWS::NoValue')).toString(),
    );
    cfnTable.addPropertyOverride('SSESpecification', {
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
    this.createModelTableDataSource(def, context, table, scope, role, tableDataSourceLogicalName);
  }
}
