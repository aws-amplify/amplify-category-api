import { Fn } from 'aws-cdk-lib';
import { Topic, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { getImportedRDSTypeFromStrategyDbType, isSqlStrategy } from '@aws-amplify/graphql-transformer-core';
import { QueryFieldType, SQLLambdaModelDataSourceStrategy, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResourceConstants } from 'graphql-transformer-common';
import { ModelVTLGenerator, RDSModelVTLGenerator } from '../resolvers';
import {
  createLayerVersionCustomResource,
  createRdsLambda,
  createRdsLambdaRole,
  createRdsPatchingLambda,
  createRdsPatchingLambdaRole,
  setRDSLayerMappings,
} from '../resolvers/rds';
import { ModelResourceGenerator } from './model-resource-generator';

/**
 * An implementation of ModelResourceGenerator responsible for generated CloudFormation resources
 * for models backed by an RDS data source
 */
export class RdsModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'RdsModelResourceGenerator';

  /**
   * Generates the AWS resources required for the data source. By default, this will generate resources for SQL data source(s) in the
   * context's `dataSourceStrategies` and `customSqlDataSourceStrategies`, but the generator can be invoked independently to support schemas
   * with custom SQL directives but no models.
   * @param context the TransformerContextProvider
   * @param strategyOverride an optional override for the SQL database strategy to generate resources for.
   */
  generateResources(context: TransformerContextProvider, strategyOverride?: SQLLambdaModelDataSourceStrategy): void {
    if (!this.isEnabled()) {
      this.generateResolvers(context);
      this.setFieldMappingResolverReferences(context);
      return;
    }

    let strategies: SQLLambdaModelDataSourceStrategy[] = [];
    if (strategyOverride) {
      strategies = [strategyOverride];
    } else {
      const dataSourceStrategies = Object.values(context.dataSourceStrategies).filter(isSqlStrategy);
      const sqlDirectiveDataSourceStrategies = context.sqlDirectiveDataSourceStrategies?.map((dss) => dss.strategy) ?? [];
      strategies = [...dataSourceStrategies, ...sqlDirectiveDataSourceStrategies];
    }

    // Unexpected, since we invoke the generateResources in response to generators that are initialized during a scan of models and custom
    // SQL, but we'll be defensive here.
    if (strategies.length === 0) {
      return;
    }

    // TODO: Remove this once we implement `combine`. For now, we only support one SQL engine
    if (strategies.length > 1) {
      throw new Error('Multiple imported SQL datasource types are detected. Only one type is supported.');
    }

    const strategy = strategies[0];
    const dbType = strategy.dbType;
    const engine = getImportedRDSTypeFromStrategyDbType(dbType);
    const secretEntry = strategy.dbConnectionConfig;
    const {
      AmplifySQLLayerNotificationTopicAccount,
      AmplifySQLLayerNotificationTopicName,
      SQLLambdaDataSourceLogicalID,
      SQLLambdaIAMRoleLogicalID,
      SQLLambdaLogicalID,
      SQLPatchingLambdaIAMRoleLogicalID,
      SQLPatchingLambdaLogicalID,
      SQLPatchingSubscriptionLogicalID,
      SQLPatchingTopicLogicalID,
      SQLStackName,
    } = ResourceConstants.RESOURCES;
    const lambdaRoleScope = context.stackManager.getScopeFor(SQLLambdaIAMRoleLogicalID, SQLStackName);
    const lambdaScope = context.stackManager.getScopeFor(SQLLambdaLogicalID, SQLStackName);

    const layerVersionArn = resolveLayerVersion(lambdaScope, context);

    const role = createRdsLambdaRole(context.resourceHelper.generateIAMRoleName(SQLLambdaIAMRoleLogicalID), lambdaRoleScope, secretEntry);

    const environment = {
      engine: engine,
      username: secretEntry.usernameSsmPath,
      password: secretEntry.passwordSsmPath,
      host: secretEntry.hostnameSsmPath,
      port: secretEntry.portSsmPath,
      database: secretEntry.databaseNameSsmPath,
    };

    const lambda = createRdsLambda(
      lambdaScope,
      context.api,
      role,
      layerVersionArn,
      environment,
      strategy.vpcConfiguration,
      strategy.sqlLambdaProvisionedConcurrencyConfig,
    );

    const patchingLambdaRoleScope = context.stackManager.getScopeFor(SQLPatchingLambdaIAMRoleLogicalID, SQLStackName);
    const patchingLambdaScope = context.stackManager.getScopeFor(SQLPatchingLambdaLogicalID, SQLStackName);
    const patchingLambdaRole = createRdsPatchingLambdaRole(
      context.resourceHelper.generateIAMRoleName(SQLPatchingLambdaIAMRoleLogicalID),
      patchingLambdaRoleScope,
      lambda.functionArn,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const patchingLambda = createRdsPatchingLambda(patchingLambdaScope, context.api, patchingLambdaRole, {
      LAMBDA_FUNCTION_ARN: lambda.functionArn,
    });

    // Add SNS subscription for patching notifications
    const topicArn = Fn.join(':', [
      'arn',
      'aws',
      'sns',
      Fn.ref('AWS::Region'),
      AmplifySQLLayerNotificationTopicAccount,
      AmplifySQLLayerNotificationTopicName,
    ]);

    const patchingSubscriptionScope = context.stackManager.getScopeFor(SQLPatchingSubscriptionLogicalID, SQLStackName);
    const snsTopic = Topic.fromTopicArn(patchingSubscriptionScope, SQLPatchingTopicLogicalID, topicArn);
    const subscription = new LambdaSubscription(patchingLambda, {
      filterPolicy: {
        Region: SubscriptionFilter.stringFilter({
          allowlist: [Fn.ref('AWS::Region')],
        }),
      },
    });
    snsTopic.addSubscription(subscription);

    const lambdaDataSourceScope = context.stackManager.getScopeFor(SQLLambdaDataSourceLogicalID, SQLStackName);
    const rdsDatasource = context.api.host.addLambdaDataSource(`${SQLLambdaDataSourceLogicalID}`, lambda, {}, lambdaDataSourceScope);
    this.models.forEach((model) => {
      context.dataSources.add(model, rdsDatasource);
      this.datasourceMap[model.name.value] = rdsDatasource;
    });

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
 * Resolves the layer version using an appropriate strategy for the current context. In the Gen1 CLI flow, the transform-graphql-schema-v2
 * buildAPIProject function retrieves the latest layer version from the S3 bucket. In the CDK construct, such async behavior at synth time
 * is forbidden, so we use an AwsCustomResource to resolve the latest layer version. The AwsCustomResource does not work with the CLI custom
 * synth functionality, so we fork the behavior at this point.
 *
 * Note that in either case, the returned value is not actually the literal layer ARN, but rather a reference to be resolved at deploy time:
 * in the CLI case, it's the resolution of the SQLLayerMapping; in the CDK case, it's the 'Body' response field from the AwsCustomResource's
 * invocation of s3::GetObject.
 *
 * TODO: Remove this once we remove SQL imports from Gen1 CLI.
 */
const resolveLayerVersion = (scope: Construct, context: TransformerContextProvider): string => {
  let layerVersionArn: string;
  if (context.rdsLayerMapping) {
    setRDSLayerMappings(scope, context.rdsLayerMapping);
    layerVersionArn = Fn.findInMap(ResourceConstants.RESOURCES.SQLLayerMappingID, Fn.ref('AWS::Region'), 'layerRegion');
  } else {
    const layerVersionCustomResource = createLayerVersionCustomResource(scope);
    layerVersionArn = layerVersionCustomResource.getResponseField('Body');
  }
  return layerVersionArn;
};
