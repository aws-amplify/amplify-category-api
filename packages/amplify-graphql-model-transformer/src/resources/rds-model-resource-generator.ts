import { QueryFieldType, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Topic, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import {
  getSqlResourceNameForStrategy,
  isSqlStrategy,
  ModelDataSourceSqlDbType,
  MYSQL_DB_TYPE,
  POSTGRES_DB_TYPE,
  ResourceConstants,
  SQLLambdaModelDataSourceStrategy,
} from 'graphql-transformer-common';
import { Fn } from 'aws-cdk-lib';
import { ModelVTLGenerator, RDSModelVTLGenerator } from '../resolvers';
import {
  createRdsLambda,
  createRdsLambdaRole,
  createRdsPatchingLambda,
  createRdsPatchingLambdaRole,
  setRDSLayerMappings,
} from '../resolvers/rds';
import { ModelResourceGenerator } from './model-resource-generator';

export const RDS_STACK_NAME = 'RdsApiStack';
// Beta SNS topic - 'arn:aws:sns:us-east-1:956468067974:AmplifyRDSLayerNotification'
// PROD SNS topic - 'arn:aws:sns:us-east-1:582037449441:AmplifyRDSLayerNotification'
const RDS_PATCHING_SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:582037449441:AmplifyRDSLayerNotification';

/**
 * An implementation of ModelResourceGenerator responsible for generated CloudFormation resources
 * for models backed by an RDS data source
 */
export class RdsModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'RdsModelResourceGenerator';
  private completedStrategyNames = new Set<string>();

  /**
   * Generates CloudFormation resources for all SQL-backed models.
   * @param context The context provider
   */
  generateResources(context: TransformerContextProvider): void {
    Object.values(context.dataSourceStrategies)
      .filter((strategy) => isSqlStrategy(strategy))
      // Force cast is safe because of the filter
      .forEach((strategy) => this.generateResourcesForModelDataSourceStrategy(context, strategy as SQLLambdaModelDataSourceStrategy));
  }

  private generateResourcesForModelDataSourceStrategy(
    context: TransformerContextProvider,
    strategy: SQLLambdaModelDataSourceStrategy,
  ): void {
    if (this.completedStrategyNames.has(strategy.name)) {
      return;
    }
    this.completedStrategyNames.add(strategy.name);
    if (this.isEnabled()) {
      const {
        SQLLambdaLogicalIDPrefix,
        SQLLambdaIAMRoleLogicalIDPrefix,

        SQLPatchingLambdaLogicalIDPrefix,
        SQLPatchingLambdaIAMRoleLogicalIDPrefix,
        SQLPatchingSubscriptionLogicalIDPrefix,
        SQLPatchingTopicNameLogicalIdPrefix,

        SQLLambdaDataSourceLogicalIDPrefix,
      } = ResourceConstants.RESOURCES;
      const lambdaRoleResourceId = getSqlResourceNameForStrategy(SQLLambdaIAMRoleLogicalIDPrefix, strategy);
      const lambdaRoleScope = context.stackManager.getScopeFor(lambdaRoleResourceId, RDS_STACK_NAME);

      const lambdaResourceId = getSqlResourceNameForStrategy(SQLLambdaLogicalIDPrefix, strategy);
      const lambdaScope = context.stackManager.getScopeFor(lambdaResourceId, RDS_STACK_NAME);
      setRDSLayerMappings(lambdaScope, strategy.name, strategy.sqlLambdaLayerMapping);

      const role = createRdsLambdaRole(context.resourceHelper.generateIAMRoleName(lambdaRoleResourceId), lambdaRoleScope, strategy);

      const lambda = createRdsLambda(lambdaScope, context.api, role, strategy, {
        engine: getEngineEnvVariableFromDbType(strategy.dbType),
        username: strategy.dbConnectionConfig.usernameSsmPath,
        password: strategy.dbConnectionConfig.passwordSsmPath,
        host: strategy.dbConnectionConfig.hostnameSsmPath,
        port: strategy.dbConnectionConfig.portSsmPath,
        database: strategy.dbConnectionConfig.databaseNameSsmPath,
      });

      const patchingLambdaResourceId = getSqlResourceNameForStrategy(SQLPatchingLambdaLogicalIDPrefix, strategy);
      const patchingLambdaScope = context.stackManager.getScopeFor(patchingLambdaResourceId, RDS_STACK_NAME);

      const patchingLambdaRoleResourceId = getSqlResourceNameForStrategy(SQLPatchingLambdaIAMRoleLogicalIDPrefix, strategy);
      const patchingLambdaRoleScope = context.stackManager.getScopeFor(patchingLambdaRoleResourceId, RDS_STACK_NAME);

      const patchingLambdaRole = createRdsPatchingLambdaRole(
        context.resourceHelper.generateIAMRoleName(patchingLambdaRoleResourceId),
        patchingLambdaRoleScope,
        lambda.functionArn,
        strategy,
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const patchingLambda = createRdsPatchingLambda(patchingLambdaScope, context.api, patchingLambdaRole, strategy, {
        LAMBDA_FUNCTION_ARN: lambda.functionArn,
      });

      // Add SNS subscription for patching notifications
      const patchingSubscriptionResourceId = getSqlResourceNameForStrategy(SQLPatchingSubscriptionLogicalIDPrefix, strategy);
      const patchingSubscriptionScope = context.stackManager.getScopeFor(patchingSubscriptionResourceId, RDS_STACK_NAME);
      const patchingTopicResourceId = getSqlResourceNameForStrategy(SQLPatchingTopicNameLogicalIdPrefix, strategy);
      const snsTopic = Topic.fromTopicArn(patchingSubscriptionScope, patchingTopicResourceId, RDS_PATCHING_SNS_TOPIC_ARN);
      const subscription = new LambdaSubscription(patchingLambda, {
        filterPolicy: {
          Region: SubscriptionFilter.stringFilter({
            allowlist: [Fn.ref('AWS::Region')],
          }),
        },
      });
      snsTopic.addSubscription(subscription);

      const lambdaDataSourceResourceId = getSqlResourceNameForStrategy(SQLLambdaDataSourceLogicalIDPrefix, strategy);
      const lambdaDataSourceScope = context.stackManager.getScopeFor(lambdaDataSourceResourceId, RDS_STACK_NAME);
      const rdsDatasource = context.api.host.addLambdaDataSource(lambdaDataSourceResourceId, lambda, {}, lambdaDataSourceScope);
      this.models.forEach((model) => {
        context.dataSources.add(model, rdsDatasource);
        this.datasourceMap[model.name.value] = rdsDatasource;
      });
    }
    this.generateResolvers(context);
    this.setFieldMappingResolverReferences(context);
  }

  // eslint-disable-next-line class-methods-use-this
  getVTLGenerator(): ModelVTLGenerator {
    return new RDSModelVTLGenerator();
  }

  setFieldMappingResolverReferences(context: TransformerContextProvider): void {
    this.models.forEach((def) => {
      const modelName = def?.name?.value;
      const modelFieldMap = context.resourceHelper.getModelFieldMap(modelName);
      if (!modelFieldMap.getMappedFields().length) {
        return;
      }
      const queryFields = this.getQueryFieldNames(def);
      const mutationFields = this.getMutationFieldNames(def);
      queryFields.forEach((query) => {
        modelFieldMap.addResolverReference({
          typeName: query.typeName,
          fieldName: query.fieldName,
          isList: [QueryFieldType.LIST, QueryFieldType.SYNC].includes(query.type),
        });
      });
      mutationFields.forEach((mutation) => {
        modelFieldMap.addResolverReference({ typeName: mutation.typeName, fieldName: mutation.fieldName, isList: false });
      });
    });
  }
}

/**
 * Maps the dbType to the `engine` environment variable of the SQL Lambda. This must be kept in sync with the engine expected by the Lambda
 * Layer code.

 * @param dbType the dbType
 */
const getEngineEnvVariableFromDbType = (dbType: ModelDataSourceSqlDbType): string => {
  switch (dbType) {
    case MYSQL_DB_TYPE:
      return 'mysql';
    case POSTGRES_DB_TYPE:
      return 'postgres';
    default:
      throw new Error(`Unsupported dbType: ${dbType}`);
  }
};
