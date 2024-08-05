import {
  getImportedRDSTypeFromStrategyDbType,
  getResourceNamesForStrategy,
  isSqlStrategy,
  SQLLambdaResourceNames,
} from '@aws-amplify/graphql-transformer-core';
import {
  isSqlModelDataSourceSecretsManagerDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionStringConfig,
  isSslCertSsmPathConfig,
  QueryFieldType,
  SQLLambdaModelDataSourceStrategy,
  TransformerContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Fn, Tags } from 'aws-cdk-lib';
import { LambdaDataSource } from 'aws-cdk-lib/aws-appsync';
import { SubscriptionFilter, Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { ObjectTypeDefinitionNode } from 'graphql';
import { ModelVTLGenerator, RDSModelVTLGenerator } from '../resolvers';
import {
  createLayerVersionCustomResource,
  createRdsLambda,
  createRdsLambdaRole,
  createRdsPatchingLambda,
  createRdsPatchingLambdaRole,
  createSNSTopicARNCustomResource,
  CredentialStorageMethod,
  getSsmEndpoint,
  setRDSLayerMappings,
  setRDSSNSTopicMappings,
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

    const strategies: Record<string, SQLLambdaModelDataSourceStrategy> = {};
    if (strategyOverride) {
      strategies[strategyOverride.name] = strategyOverride;
    } else {
      const dataSourceStrategies = Object.values(context.dataSourceStrategies).filter(isSqlStrategy);
      dataSourceStrategies.forEach((strategy) => (strategies[strategy.name] = strategy));
      const sqlDirectiveDataSourceStrategies = context.sqlDirectiveDataSourceStrategies?.map((dss) => dss.strategy) ?? [];
      sqlDirectiveDataSourceStrategies.forEach((strategy) => (strategies[strategy.name] = strategy));
    }

    // Unexpected, since we invoke the generateResources in response to generators that are initialized during a scan of models and custom
    // SQL, but we'll be defensive here.
    if (Object.keys(strategies).length === 0) {
      throw new Error('No SQL datasource types are detected. This is an unexpected error.');
    }

    const modelStrategyMatches = (model: ObjectTypeDefinitionNode, strategyName: string): boolean => {
      const strategyFromContext = context.dataSourceStrategies[model.name.value];
      if (isSqlStrategy(strategyFromContext)) {
        return strategyFromContext.name === strategyName;
      } else {
        return false;
      }
    };

    // We generate data sources per strategy, and then reverse-map the models that use that data source
    for (const strategy of Object.values(strategies)) {
      const dataSource = this.generateDataSourceAndResourcesForStrategy(context, strategy);
      const strategyName = strategy.name;
      this.models
        .filter((model) => modelStrategyMatches(model, strategyName))
        .forEach((model) => {
          context.dataSources.add(model, dataSource);
          this.datasourceMap[model.name.value] = dataSource;
        });
    }
    this.generateResolvers(context);
    this.setFieldMappingResolverReferences(context);
  }

  private generateDataSourceAndResourcesForStrategy = (
    context: TransformerContextProvider,
    strategy: SQLLambdaModelDataSourceStrategy,
  ): LambdaDataSource => {
    const resourceNames = getResourceNamesForStrategy(strategy);

    const dbType = strategy.dbType;
    const engine = getImportedRDSTypeFromStrategyDbType(dbType);
    const dbConnectionConfig = strategy.dbConnectionConfig;
    const secretEntry = strategy.dbConnectionConfig;
    const lambdaRoleScope = context.stackManager.getScopeFor(resourceNames.sqlLambdaExecutionRole, resourceNames.sqlStack);
    const lambdaScope = context.stackManager.getScopeFor(resourceNames.sqlLambdaFunction, resourceNames.sqlStack);

    const sslCertConfig = strategy.dbConnectionConfig.sslCertConfig;
    const sslCertSsmPath = isSslCertSsmPathConfig(sslCertConfig) ? sslCertConfig.ssmPath : undefined;

    const layerVersionArn = resolveLayerVersion(lambdaScope, context, resourceNames);

    const role = createRdsLambdaRole(
      context.resourceHelper.generateIAMRoleName(resourceNames.sqlLambdaExecutionRole),
      lambdaRoleScope,
      dbConnectionConfig,
      resourceNames,
      sslCertSsmPath,
    );

    const environment: { [key: string]: string } = {
      engine,
    };
    let credentialStorageMethod;
    if (isSqlModelDataSourceSsmDbConnectionConfig(secretEntry)) {
      environment.CREDENTIAL_STORAGE_METHOD = 'SSM';
      environment.username = secretEntry.usernameSsmPath;
      environment.password = secretEntry.passwordSsmPath;
      environment.host = secretEntry.hostnameSsmPath;
      environment.port = secretEntry.portSsmPath;
      environment.database = secretEntry.databaseNameSsmPath;
      credentialStorageMethod = CredentialStorageMethod.SSM;
    } else if (isSqlModelDataSourceSecretsManagerDbConnectionConfig(secretEntry)) {
      environment.CREDENTIAL_STORAGE_METHOD = 'SECRETS_MANAGER';
      environment.secretArn = secretEntry.secretArn;
      environment.port = secretEntry.port.toString();
      environment.database = secretEntry.databaseName;
      environment.host = secretEntry.hostname;
      credentialStorageMethod = CredentialStorageMethod.SECRETS_MANAGER;
    } else if (isSqlModelDataSourceSsmDbConnectionStringConfig(secretEntry)) {
      environment.CREDENTIAL_STORAGE_METHOD = 'SSM';
      environment.connectionString = JSON.stringify(secretEntry.connectionUriSsmPath);
      credentialStorageMethod = CredentialStorageMethod.SSM;
    }

    // Note that the JSON.stringify operation will turn a single string value into a JSON string inside double-quotes:
    // - sslCertSsmPath = 'foo'; // env.SSL_CERT_SSM_PATH = '"foo"';
    // - sslCertSsmPath = ['foo', 'bar']; // env.SSL_CERT_SSM_PATH = '["foo","bar"]';
    //
    // Note also that we set the SSM endpoint in the Lambda environment since it is required to allow the Lambda to retrieve the custom SSL
    // cert, even if the rest of the DB configuration is stored in Secrets Manager.
    if (sslCertSsmPath) {
      environment.SSL_CERT_SSM_PATH = JSON.stringify(sslCertSsmPath);
      environment.SSM_ENDPOINT = getSsmEndpoint(lambdaScope, resourceNames, strategy.vpcConfiguration);
    }

    const lambda = createRdsLambda(
      lambdaScope,
      context.api,
      role,
      layerVersionArn,
      resourceNames,
      credentialStorageMethod,
      environment,
      strategy.vpcConfiguration,
      strategy.sqlLambdaProvisionedConcurrencyConfig,
    );

    // Note that this tag will be added to either the bare function, or the alias created to handle provisioned concurrency
    Tags.of(lambda).add('amplify:function-type', 'sql-data-source');

    const patchingLambdaRoleScope = context.stackManager.getScopeFor(resourceNames.sqlPatchingLambdaExecutionRole, resourceNames.sqlStack);
    const patchingLambdaRole = createRdsPatchingLambdaRole(
      context.resourceHelper.generateIAMRoleName(resourceNames.sqlPatchingLambdaExecutionRole),
      patchingLambdaRoleScope,
      lambda.functionArn,
      resourceNames,
    );

    const patchingLambdaScope = context.stackManager.getScopeFor(resourceNames.sqlPatchingLambdaFunction, resourceNames.sqlStack);
    const patchingLambda = createRdsPatchingLambda(patchingLambdaScope, context.api, patchingLambdaRole, resourceNames, {
      LAMBDA_FUNCTION_ARN: lambda.functionArn,
    });

    // Add SNS subscription for patching notifications
    const topicArn = resolveSNSTopicARN(lambdaScope, context, resourceNames);

    const patchingSubscriptionScope = context.stackManager.getScopeFor(resourceNames.sqlPatchingSubscription, resourceNames.sqlStack);
    const snsTopic = Topic.fromTopicArn(patchingSubscriptionScope, resourceNames.sqlPatchingTopic, topicArn);
    const subscription = new LambdaSubscription(patchingLambda, {
      filterPolicy: {
        Region: SubscriptionFilter.stringFilter({
          allowlist: [Fn.ref('AWS::Region')],
        }),
      },
    });
    snsTopic.addSubscription(subscription);

    const lambdaDataSourceScope = context.stackManager.getScopeFor(resourceNames.sqlLambdaDataSource, resourceNames.sqlStack);
    const sqlDatasource = context.api.host.addLambdaDataSource(resourceNames.sqlLambdaDataSource, lambda, {}, lambdaDataSourceScope);

    return sqlDatasource;
  };

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
const resolveLayerVersion = (scope: Construct, context: TransformerContextProvider, resourceNames: SQLLambdaResourceNames): string => {
  let layerVersionArn: string;
  if (context.rdsLayerMapping) {
    setRDSLayerMappings(scope, context.rdsLayerMapping, resourceNames);
    layerVersionArn = Fn.findInMap(resourceNames.sqlLayerVersionMapping, Fn.ref('AWS::Region'), 'layerRegion');
  } else {
    const layerVersionCustomResource = createLayerVersionCustomResource(scope, resourceNames);
    layerVersionArn = layerVersionCustomResource.getResponseField('Body');
  }
  return layerVersionArn;
};

/**
 * Resolves the SNS topic ARN that the patching lambda in the customer's account subscribes to listen for lambda layer updates from the
 * service. In the Gen1 CLI flow, the transform-graphql-schema-v2 buildAPIProject function retrieves the latest layer version from the S3
 * bucket. In the CDK construct, such async behavior at synth time is forbidden, so we use an AwsCustomResource to resolve the latest layer
 * version. The AwsCustomResource does not work with the CLI custom synth functionality, so we fork the behavior at this point.
 *
 * Note that in either case, the returned value is not actually the literal layer ARN, but rather a reference to be resolved at deploy time:
 * in the CLI case, it's the resolution of the SQLLayerMapping; in the CDK case, it's the 'Body' response field from the AwsCustomResource's
 * invocation of s3::GetObject.
 *
 * TODO: Remove this once we remove SQL imports from Gen1 CLI.
 */
const resolveSNSTopicARN = (scope: Construct, context: TransformerContextProvider, resourceNames: SQLLambdaResourceNames): string => {
  if (context.rdsSnsTopicMapping) {
    setRDSSNSTopicMappings(scope, context.rdsSnsTopicMapping, resourceNames);
    return Fn.findInMap(resourceNames.sqlSNSTopicArnMapping, Fn.ref('AWS::Region'), 'topicArn');
  }
  const layerVersionCustomResource = createSNSTopicARNCustomResource(scope, resourceNames);
  return layerVersionCustomResource.getResponseField('Body');
};
