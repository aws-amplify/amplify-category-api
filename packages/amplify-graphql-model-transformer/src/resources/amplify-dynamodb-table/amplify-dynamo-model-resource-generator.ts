import * as cdk from 'aws-cdk-lib';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { ObjectTypeDefinitionNode } from 'graphql';
import { setResourceName } from '@aws-amplify/graphql-transformer-core';
import { AttributeType, StreamViewType, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { Duration, aws_iam, aws_lambda } from 'aws-cdk-lib';
import { DynamoModelResourceGenerator } from '../dynamo-model-resource-generator';
import * as path from 'path';
import { AmplifyDynamoDBTable } from './amplify-dynamodb-table-construct';
import { WaiterStateMachine } from './waiter-state-machine';
import { Provider } from './provider';

/**
 * AmplifyDynamoModelResourceGenerator is a subclass of DynamoModelResourceGenerator,
 * provisioning the DynamoDB tables with the custom resource instead of pre-defined DynamoDB table CFN template
 */

export const ITERATIVE_TABLE_STACK_NAME = 'AmplifyTableManager';
export class AmplifyDynamoModelResourceGenerator extends DynamoModelResourceGenerator {
  private customResourceServiceToken = '';

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

    this.generateResolvers(ctx);
  }

  protected createCustomProviderResource(scope: Construct, context: TransformerContextProvider): void {
    const lambdaCode = aws_lambda.Code.fromAsset(
      path.join(__dirname, '..', '..', '..', 'lib', 'resources', 'amplify-dynamodb-table', 'amplify-table-manager-lambda'),
      { exclude: ['*.ts'] },
    );

    // PolicyDocument that grants access to Create/Update/Delete relevant DynamoDB tables
    const lambdaPolicyDocument = new aws_iam.PolicyDocument({
      statements: [
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
            'dynamodb:TagResource',
          ],
          resources: [
            // eslint-disable-next-line no-template-curly-in-string
            cdk.Fn.sub('arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/*-${apiId}-${envName}', {
              apiId: context.api.apiId,
              envName: context.synthParameters.amplifyEnvironmentName,
            }),
          ],
        }),
        new aws_iam.PolicyStatement({
          actions: [
            'lambda:ListTags',
          ],
          resources: [
            // eslint-disable-next-line no-template-curly-in-string
            cdk.Fn.sub('arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:*TableManager*', {}),
          ],
        }),
      ],
    });

    // Note: The isCompleteRole and onEventRole are similar enough that you might ask "why not just use a single role?"
    // 1. Doing so creates a circular dependency between someCombinedRole <-> waiterStateMachine
    // 2. The isCompleteHandler doesn't need permissions to invoke the waiterStateMachine.

    // Role assumed by the isCompleteHandler.
    // We want to avoid the auto-generated default policy for this to avoid unnecessary deployment time
    // slowdowns, hence the `withoutPolicyUpdates()`
    const isCompleteRole = new aws_iam.Role(scope, 'AmplifyManagedTableIsCompleteRole', {
      assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        CreateUpdateDeleteTablesPolicy: lambdaPolicyDocument,
      },
    }).withoutPolicyUpdates();

    // Role assumed by the onEventHandler (custom resource entry point).
    // We need to keep this open to modification so that waiter state machine can grant it
    // invocation permissions below, hence no `withoutPolicyUpdates()`
    const onEventRole = new aws_iam.Role(scope, 'AmplifyManagedTableOnEventRole', {
      assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        CreateUpdateDeleteTablesPolicy: lambdaPolicyDocument,
      },
    });

    // Create the custom resource provider with the infrastructure to handle resource modifications.
    /** !! Be extra cautious about any modifications to this code -- see inline note in {@link Provider} !! */
    const customResourceProvider = new Provider(scope, ResourceConstants.RESOURCES.TableManagerCustomProviderLogicalID, {
      lambdaCode,
      onEventHandlerName: 'amplify-table-manager-handler.onEvent',
      onEventRole,
      isCompleteHandlerName: 'amplify-table-manager-handler.isComplete',
      isCompleteRole,
    });

    const { onEventHandler, isCompleteHandler, serviceToken } = customResourceProvider;

    // --- Waiter state machine configuration
    // Invoke isCompleteHandler every 10 seconds to query completion status.
    // 10 seconds is the current value because it showed deployment time improvements
    // over higher values. < 10 seconds showed diminishing returns of those improvements
    // at the cost of more lambda invocations.
    const queryInterval = Duration.seconds(10);
    // CloudFormation times out custom resource requests at 1 hour.
    // https://github.com/aws/aws-cdk/blob/11621e78c8f8188fcdd528d01cd2aa8bd97db58f/packages/aws-cdk-lib/custom-resources/lib/provider-framework/provider.ts#L59-L66
    // Once that happens, there's no use continuing to invoke the isComplete handler.
    const totalTimeout = Duration.hours(1);
    const stateMachineProps = {
      isCompleteHandler,
      queryInterval,
      totalTimeout,
      maxAttempts: totalTimeout.toSeconds() / queryInterval.toSeconds(),
      backoffRate: 1,
    };

    const waiterStateMachine = new WaiterStateMachine(scope, 'AmplifyTableWaiterStateMachine', stateMachineProps);

    // The onEventHandler needs to know the state machine ARN to start it, so that it can query completion status
    // when invoking the isCompleteHandler.
    onEventHandler.addEnvironment('WAITER_STATE_MACHINE_ARN', waiterStateMachine.stateMachineArn);
    // It also needs permissions to invoke it.
    waiterStateMachine.grantStartExecution(onEventHandler);
    // This is the entry point of the custom resource -- make sure this value never changes!
    /** See inline note in {@link Provider} for more details */
    this.customResourceServiceToken = serviceToken;
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
