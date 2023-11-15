import { RDSConnectionSecrets, getImportedRDSType, getEngineFromDBType } from '@aws-amplify/graphql-transformer-core';
import { QueryFieldType, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Topic, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { ResourceConstants } from 'graphql-transformer-common';
import { Fn } from 'aws-cdk-lib';
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

  generateResources(context: TransformerContextProvider): void {
    if (this.isEnabled()) {
      const dbType = getImportedRDSType(context.modelToDatasourceMap);
      const engine = getEngineFromDBType(dbType);
      const secretEntry = context.datasourceSecretParameterLocations.get(dbType);
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

      // Bimodal behavior alert: In the Gen1 CLI flow, the transform-graphql-schema-v2 buildAPIProject function retrieves the latest layer
      // version from the S3 bucket. In the CDK construct, such async behavior at synth time is forbidden, so we use an AwsCustomResource to
      // resolve the latest layer version. The AwsCustomResource does not work with the CLI custom synth functionality, so we fork the
      // behavior at this point.
      let layerVersionArn: string;
      if (context.rdsLayerMapping) {
        setRDSLayerMappings(lambdaScope, context.rdsLayerMapping);
        layerVersionArn = Fn.findInMap(ResourceConstants.RESOURCES.SQLLayerMappingID, Fn.ref('AWS::Region'), 'layerRegion');
      } else {
        const layerVersionCustomResource = createLayerVersionCustomResource(lambdaScope);
        layerVersionArn = layerVersionCustomResource.getResponseField('Body');
      }

      const role = createRdsLambdaRole(
        context.resourceHelper.generateIAMRoleName(SQLLambdaIAMRoleLogicalID),
        lambdaRoleScope,
        secretEntry as RDSConnectionSecrets,
      );

      const lambda = createRdsLambda(
        lambdaScope,
        context.api,
        role,
        layerVersionArn,
        {
          engine: engine,
          username: secretEntry?.username ?? '',
          password: secretEntry?.password ?? '',
          host: secretEntry?.host ?? '',
          port: secretEntry?.port ?? '',
          database: secretEntry?.database ?? '',
        },
        context.sqlLambdaVpcConfig,
        context.sqlLambdaProvisionedConcurrencyConfig,
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
