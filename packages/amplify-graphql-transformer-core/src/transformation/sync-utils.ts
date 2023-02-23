import {
  AttributeType, BillingMode, StreamViewType, Table,
} from '@aws-cdk/aws-dynamodb';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { ResourceConstants, SyncResourceIDs } from 'graphql-transformer-common';
import {
  StackManagerProvider,
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
// eslint-disable-next-line import/no-cycle
import { TransformerContext } from '../transformer-context';
import { ResolverConfig, SyncConfig, SyncConfigLambda } from '../config/transformer-config';

type DeltaSyncConfig = {
  DeltaSyncTableName: unknown;
  DeltaSyncTableTTL: number;
  BaseTableTTL: number;
};

/**
 * Creates the SyncTable required for the data store
 * @param context TransformerContext
 */
export const createSyncTable = (context: TransformerContext): void => {
  const stack = context.stackManager.getStackFor(SyncResourceIDs.syncTableName);
  const tableName = context.resourceHelper.generateTableName(SyncResourceIDs.syncTableName);
  // eslint-disable-next-line no-new
  const table = new Table(stack, SyncResourceIDs.syncDataSourceID, {
    tableName,
    partitionKey: {
      name: SyncResourceIDs.syncPrimaryKey,
      type: AttributeType.STRING,
    },
    sortKey: {
      name: SyncResourceIDs.syncRangeKey,
      type: AttributeType.STRING,
    },
    stream: StreamViewType.NEW_AND_OLD_IMAGES,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    billingMode: BillingMode.PAY_PER_REQUEST,
    timeToLiveAttribute: '_ttl',
  });

  // Add the GSI for delta sync table required for the data store.
  // This index is used for Custom Primary Key scenarios only.
  // AppSync will not populate these fields if the model doesn't contain a custom primary key
  table.addGlobalSecondaryIndex({
    indexName: SyncResourceIDs.syncGSIName,
    partitionKey: {
      name: SyncResourceIDs.syncGSIPartitionKey,
      type: AttributeType.STRING,
    },
    sortKey: {
      name: SyncResourceIDs.syncGSISortKey,
      type: AttributeType.STRING,
    },
  });

  createSyncIAMRole(context, stack, tableName);
};

const createSyncIAMRole = (context: TransformerContext, stack: cdk.Stack, tableName: string): void => {
  const role = new iam.Role(stack, SyncResourceIDs.syncIAMRoleName, {
    roleName: context.resourceHelper.generateIAMRoleName(SyncResourceIDs.syncIAMRoleName),
    assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
  });

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
          ],
        }),
      ],
    }),
  );
};

/**
 *
 */
export const syncDataSourceConfig = (): DeltaSyncConfig => ({
  DeltaSyncTableName: joinWithEnv('-', [
    SyncResourceIDs.syncTableName,
    cdk.Fn.getAtt(ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
  ]),
  DeltaSyncTableTTL: 30,
  BaseTableTTL: 43200, // 30 days
});

/**
 *
 */
export const validateResolverConfigForType = (ctx: TransformerSchemaVisitStepContextProvider, typeName: string): void => {
  const resolverConfig = ctx.getResolverConfig<ResolverConfig>();
  const typeResolverConfig = resolverConfig?.models?.[typeName];
  if (typeResolverConfig && (!typeResolverConfig.ConflictDetection || !typeResolverConfig.ConflictHandler)) {
    console.warn(`Invalid resolverConfig for type ${typeName}. Using the project resolverConfig instead.`);
  }
};

/**
 *
 */
export const getSyncConfig = (ctx: TransformerTransformSchemaStepContextProvider, typeName: string): SyncConfig | undefined => {
  let syncConfig: SyncConfig | undefined;

  const resolverConfig = ctx.getResolverConfig<ResolverConfig>();
  syncConfig = resolverConfig?.project;

  const typeResolverConfig = resolverConfig?.models?.[typeName];
  if (typeResolverConfig && typeResolverConfig.ConflictDetection && typeResolverConfig.ConflictHandler) {
    syncConfig = typeResolverConfig;
  }

  if (syncConfig && isLambdaSyncConfig(syncConfig) && !syncConfig.LambdaConflictHandler.lambdaArn) {
    const { name, region } = syncConfig.LambdaConflictHandler;
    const syncLambdaArn = syncLambdaArnResource(ctx.stackManager, name, region);
    syncConfig.LambdaConflictHandler.lambdaArn = syncLambdaArn;
  }

  return syncConfig;
};

/**
 *
 */
export const isLambdaSyncConfig = (syncConfig: SyncConfig): syncConfig is SyncConfigLambda => {
  const lambdaConfigKey: keyof SyncConfigLambda = 'LambdaConflictHandler';
  if (syncConfig && syncConfig.ConflictHandler === 'LAMBDA') {
    // eslint-disable-next-line no-prototype-builtins
    if (syncConfig.hasOwnProperty(lambdaConfigKey)) {
      return true;
    }
    throw Error('Invalid Lambda SyncConfig');
  }
  return false;
}

export function createSyncLambdaIAMPolicy(context: TransformerContextProvider, stack: cdk.Stack, name: string, region?: string): iam.Policy {
  return new iam.Policy(stack, 'InvokeLambdaFunction', {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [syncLambdaArnResource(context.stackManager, name, region)],
      }),
    ],
  });
}

function syncLambdaArnResource(stackManager: StackManagerProvider, name: string, region?: string): string {
  const substitutions = {};
  if (referencesEnv(name)) {
    Object.assign(substitutions, {
      env: stackManager.getParameter(ResourceConstants.PARAMETERS.Env),
    });
  }
  return cdk.Fn.conditionIf(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    cdk.Fn.sub(lambdaArnKey(name, region), substitutions),
    cdk.Fn.sub(lambdaArnKey(removeEnvReference(name), region), {}),
  ).toString();
};

const referencesEnv = (value: string): boolean => value.match(/(\${env})/) !== null;

const lambdaArnKey = (name: string, region?: string): string => (region
  ? `arn:aws:lambda:${region}:\${AWS::AccountId}:function:${name}`
  : `arn:aws:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${name}`);

const removeEnvReference = (value: string): string => value.replace(/(-\${env})/, '');

const joinWithEnv = (separator: string, listToJoin: any[]): cdk.ICfnRuleConditionExpression => cdk.Fn.conditionIf(
  ResourceConstants.CONDITIONS.HasEnvironmentParameter,
  cdk.Fn.join(separator, [...listToJoin, cdk.Fn.ref(ResourceConstants.PARAMETERS.Env)]),
  cdk.Fn.join(separator, listToJoin),
);
