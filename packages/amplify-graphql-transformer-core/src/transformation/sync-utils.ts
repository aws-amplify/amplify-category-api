import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ResourceConstants, SyncResourceIDs } from 'graphql-transformer-common';
import {
  SynthParameters,
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';
// eslint-disable-next-line import/no-cycle
import { TransformerContext } from '../transformer-context';
import { ResolverConfig, SyncConfig, SyncConfigLambda } from '../config/transformer-config';
import { setResourceName } from '../utils';

type DeltaSyncConfig = {
  DeltaSyncTableName: any;
  DeltaSyncTableTTL: number;
  BaseTableTTL: number;
};

export function createSyncTable(context: TransformerContext) {
  const scope = context.stackManager.getScopeFor(SyncResourceIDs.syncTableName);
  const tableName = context.resourceHelper.generateTableName(SyncResourceIDs.syncTableName);
  const syncTable = new Table(scope, SyncResourceIDs.syncDataSourceID, {
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
  setResourceName(syncTable, { name: SyncResourceIDs.syncTableName, setOnDefaultChild: true });

  createSyncIAMRole(context, scope, tableName);
}

function createSyncIAMRole(context: TransformerContext, scope: Construct, tableName: string) {
  const role = new iam.Role(scope, SyncResourceIDs.syncIAMRoleName, {
    roleName: context.resourceHelper.generateIAMRoleName(SyncResourceIDs.syncIAMRoleName),
    assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
  });
  setResourceName(role, { name: SyncResourceIDs.syncIAMRoleName, setOnDefaultChild: true });

  role.attachInlinePolicy(
    new iam.Policy(scope, 'DynamoDBAccess', {
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
}

export function syncDataSourceConfig(): DeltaSyncConfig {
  return {
    DeltaSyncTableName: joinWithEnv('-', [
      SyncResourceIDs.syncTableName,
      cdk.Fn.getAtt(ResourceConstants.RESOURCES.GraphQLAPILogicalID, 'ApiId'),
    ]),
    DeltaSyncTableTTL: 30,
    BaseTableTTL: 43200, // 30 days
  };
}

export function validateResolverConfigForType(ctx: TransformerSchemaVisitStepContextProvider, typeName: string): void {
  const resolverConfig = ctx.getResolverConfig<ResolverConfig>();
  const typeResolverConfig = resolverConfig?.models?.[typeName];
  if (typeResolverConfig && (!typeResolverConfig.ConflictDetection || !typeResolverConfig.ConflictHandler)) {
    console.warn(`Invalid resolverConfig for type ${typeName}. Using the project resolverConfig instead.`);
  }
}

export function getSyncConfig(ctx: TransformerTransformSchemaStepContextProvider, typeName: string): SyncConfig | undefined {
  let syncConfig: SyncConfig | undefined;

  const resolverConfig = ctx.getResolverConfig<ResolverConfig>();
  syncConfig = resolverConfig?.project;

  const typeResolverConfig = resolverConfig?.models?.[typeName];
  if (typeResolverConfig && typeResolverConfig.ConflictDetection && typeResolverConfig.ConflictHandler) {
    syncConfig = typeResolverConfig;
  }

  if (syncConfig && isLambdaSyncConfig(syncConfig) && !syncConfig.LambdaConflictHandler.lambdaArn) {
    const { name, region } = syncConfig.LambdaConflictHandler;
    const syncLambdaArn = syncLambdaArnResource(ctx.synthParameters, name, region);
    syncConfig.LambdaConflictHandler.lambdaArn = syncLambdaArn;
  }

  return syncConfig;
}

export function isLambdaSyncConfig(syncConfig: SyncConfig): syncConfig is SyncConfigLambda {
  const lambdaConfigKey: keyof SyncConfigLambda = 'LambdaConflictHandler';
  if (syncConfig && syncConfig.ConflictHandler === 'LAMBDA') {
    if (syncConfig.hasOwnProperty(lambdaConfigKey)) {
      return true;
    }
    throw Error(`Invalid Lambda SyncConfig`);
  }
  return false;
}

export function createSyncLambdaIAMPolicy(
  context: TransformerContextProvider,
  scope: Construct,
  name: string,
  region?: string,
): iam.Policy {
  return new iam.Policy(scope, 'InvokeLambdaFunction', {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [syncLambdaArnResource(context.synthParameters, name, region)],
      }),
    ],
  });
}

function syncLambdaArnResource(synthParameters: SynthParameters, name: string, region?: string): string {
  const substitutions = {};
  if (referencesEnv(name)) {
    Object.assign(substitutions, { env: synthParameters.amplifyEnvironmentName });
  }
  return cdk.Fn.conditionIf(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    cdk.Fn.sub(lambdaArnKey(name, region), substitutions),
    cdk.Fn.sub(lambdaArnKey(removeEnvReference(name), region), {}),
  ).toString();
}

function referencesEnv(value: string): boolean {
  return value.match(/(\${env})/) !== null;
}

function lambdaArnKey(name: string, region?: string): string {
  return region
    ? `arn:aws:lambda:${region}:\${AWS::AccountId}:function:${name}`
    : `arn:aws:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${name}`;
}

function removeEnvReference(value: string): string {
  return value.replace(/(-\${env})/, '');
}

function joinWithEnv(separator: string, listToJoin: any[]) {
  return cdk.Fn.conditionIf(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    cdk.Fn.join(separator, [...listToJoin, cdk.Fn.ref(ResourceConstants.PARAMETERS.Env)]),
    cdk.Fn.join(separator, listToJoin),
  );
}
