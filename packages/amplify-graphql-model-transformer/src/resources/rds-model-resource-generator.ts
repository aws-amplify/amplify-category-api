import { MYSQL_DB_TYPE, RDSConnectionSecrets, POSTGRES_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { QueryFieldType, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Topic, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { ResourceConstants } from 'graphql-transformer-common';
import { ModelVTLGenerator, RDSModelVTLGenerator } from '../resolvers';
import {
  createRdsLambda,
  createRdsLambdaRole,
  createRdsPatchingLambda,
  createRdsPatchingLambdaRole,
  setRDSLayerMappings,
} from '../resolvers/rds';
import { ModelResourceGenerator } from './model-resource-generator';
import { Fn } from 'aws-cdk-lib';

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

  generateResources(context: TransformerContextProvider): void {
    if (this.isEnabled()) {
      const secretEntry = context.datasourceSecretParameterLocations.get(MYSQL_DB_TYPE);
      const {
        RDSLambdaIAMRoleLogicalID,
        RDSPatchingLambdaIAMRoleLogicalID,
        RDSLambdaLogicalID,
        RDSPatchingLambdaLogicalID,
        RDSLambdaDataSourceLogicalID,
        RDSPatchingSubscriptionLogicalID,
      } = ResourceConstants.RESOURCES;
      const engine = this.getDBEngine(context);
      const lambdaRoleScope = context.stackManager.getScopeFor(RDSLambdaIAMRoleLogicalID, RDS_STACK_NAME);
      const lambdaScope = context.stackManager.getScopeFor(RDSLambdaLogicalID, RDS_STACK_NAME);
      setRDSLayerMappings(lambdaScope, context.rdsLayerMapping);
      const role = createRdsLambdaRole(
        context.resourceHelper.generateIAMRoleName(RDSLambdaIAMRoleLogicalID),
        lambdaRoleScope,
        secretEntry as RDSConnectionSecrets,
      );

      const lambda = createRdsLambda(
        lambdaScope,
        context.api,
        role,
        {
          engine: engine,
          username: secretEntry?.username ?? '',
          password: secretEntry?.password ?? '',
          host: secretEntry?.host ?? '',
          port: secretEntry?.port ?? '',
          database: secretEntry?.database ?? '',
        },
        context.sqlLambdaVpcConfig,
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
      const snsTopic = Topic.fromTopicArn(patchingSubscriptionScope, 'RDSPatchingTopic', RDS_PATCHING_SNS_TOPIC_ARN);
      const subscription = new LambdaSubscription(patchingLambda, {
        filterPolicy: {
          Region: SubscriptionFilter.stringFilter({
            allowlist: [Fn.ref('AWS::Region')],
          }),
        },
      });
      snsTopic.addSubscription(subscription);

      const lambdaDataSourceScope = context.stackManager.getScopeFor(RDSLambdaDataSourceLogicalID, RDS_STACK_NAME);
      const rdsDatasource = context.api.host.addLambdaDataSource(`${RDSLambdaDataSourceLogicalID}`, lambda, {}, lambdaDataSourceScope);
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

  /*
    Checks the modelToDatasource Map for the RDS models
    and returns the engine type.
    Throws error if multiple engines are encountered.
  */
  getDBEngine(context: TransformerContextProvider): string {
    const engineSet = new Set<string>();
    this.models.map((model) => {
      const modelDatasourceType = context?.modelToDatasourceMap?.get(model.name.value)?.dbType;
      switch (modelDatasourceType) {
        case MYSQL_DB_TYPE:
          engineSet.add('mysql');
          break;
        case POSTGRES_DB_TYPE:
          engineSet.add('postgres');
          break;
        default:
          throw new Error(`Unsupported RDS datasource type: ${modelDatasourceType}`);
      }
    });
    if (engineSet.size > 1) {
      throw new Error(`Multiple RDS datasource types ${Array.from(engineSet)} are detected. Only one type is supported.`);
    }
    return engineSet.values().next().value;
  }
}
