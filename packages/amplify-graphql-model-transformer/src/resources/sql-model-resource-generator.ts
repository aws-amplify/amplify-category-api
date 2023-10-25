import { MYSQL_DB_TYPE, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceDefinition, QueryFieldType, SQLLambdaModelDataSourceDefinitionStrategy, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Topic, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { ResourceConstants } from 'graphql-transformer-common';
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
 * for models backed by a SQL Lambda model data source
 */
export class SqlLambdaModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'RdsModelResourceGenerator';

  generateResources(context: TransformerContextProvider): void {
    const visitedModelDataSources: string[] = [];

    this.generateResolvers(context);
    this.setFieldMappingResolverReferences(context);
  }

  private generateResourcesForModelDataSourceDefinition(
    context: TransformerContextProvider,
      definition: {
        name: string,
        strategy: SQLLambdaModelDataSourceDefinitionStrategy
      }
  ): void {
    if (this.isEnabled()) {
      const dbConfig = definition.strategy.dbConnectionConfig;
      const {
        RDSLambdaIAMRoleLogicalID,
        RDSPatchingLambdaIAMRoleLogicalID,
        RDSLambdaLogicalID,
        RDSPatchingLambdaLogicalID,
        RDSLambdaDataSourceLogicalID,
        RDSPatchingSubscriptionLogicalID,
      } = ResourceConstants.RESOURCES;
      const lambdaRoleScope = context.stackManager.getScopeFor(RDSLambdaIAMRoleLogicalID, RDS_STACK_NAME);
      const lambdaScope = context.stackManager.getScopeFor(RDSLambdaLogicalID, RDS_STACK_NAME);
      setRDSLayerMappings(lambdaScope, definition.strategy.sqlLambdaLayerMapping);
      const role = createRdsLambdaRole(
        context.resourceHelper.generateIAMRoleName(RDSLambdaIAMRoleLogicalID),
        lambdaRoleScope,
        dbConfig,
      );

      const lambda = createRdsLambda(
        lambdaScope,
        context.api,
        role,
        {
          username: dbConfig.usernameSsmPath,
          password: dbConfig.passwordSsmPath,
          host: dbConfig.hostnameSsmPath,
          port: dbConfig.portSsmPath,
          database: dbConfig.databaseNameSsmPath,
        },
        definition.strategy.vpcConfiguration
      );

      const patchingLambdaRoleScope = context.stackManager.getScopeFor(RDSPatchingLambdaIAMRoleLogicalID, RDS_STACK_NAME);
      const patchingLambdaScope = context.stackManager.getScopeFor(RDSPatchingLambdaLogicalID, RDS_STACK_NAME);
      const patchingLambdaRole = createRdsPatchingLambdaRole(
        context.resourceHelper.generateIAMRoleName(RDSPatchingLambdaIAMRoleLogicalID),
        patchingLambdaRoleScope,
        lambda.functionArn,
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const patchingLambda = createRdsPatchingLambda(patchingLambdaScope, context.api, patchingLambdaRole, {
        LAMBDA_FUNCTION_ARN: lambda.functionArn,
      });

      // Add SNS subscription for patching notifications
      const patchingSubscriptionScope = context.stackManager.getScopeFor(RDSPatchingSubscriptionLogicalID, RDS_STACK_NAME);
      const snsTopic = Topic.fromTopicArn(patchingSubscriptionScope, `RDSPatchingTopic${definition.name}`, RDS_PATCHING_SNS_TOPIC_ARN);
      const subscription = new LambdaSubscription(patchingLambda, {
        filterPolicy: {
          Region: SubscriptionFilter.stringFilter({
            allowlist: [Fn.ref('AWS::Region')],
          }),
        },
      });
      snsTopic.addSubscription(subscription);

      const lambdaDataSourceScope = context.stackManager.getScopeFor(RDSLambdaDataSourceLogicalID, RDS_STACK_NAME);
      const sqlDataSource = context.api.host.addLambdaDataSource(`${RDSLambdaDataSourceLogicalID}${definition.name}`, lambda, {}, lambdaDataSourceScope);
      this.models.forEach((model) => {
        context.dataSources.add(model, sqlDataSource);
        this.datasourceMap[model.name.value] = sqlDataSource;
      });
    }
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
