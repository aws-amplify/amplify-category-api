import { MYSQL_DB_TYPE, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Topic } from 'aws-cdk-lib/aws-sns';
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
import { SubscriptionFilter } from 'aws-cdk-lib/aws-sns';

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
      const lambdaRoleStack = context.stackManager.getStackFor(RDSLambdaIAMRoleLogicalID, RDS_STACK_NAME);
      const lambdaStack = context.stackManager.getStackFor(RDSLambdaLogicalID, RDS_STACK_NAME);
      setRDSLayerMappings(lambdaStack, context.rdsLayerMapping);
      const role = createRdsLambdaRole(
        context.resourceHelper.generateIAMRoleName(RDSLambdaIAMRoleLogicalID),
        lambdaRoleStack,
        secretEntry as RDSConnectionSecrets,
      );

      const lambda = createRdsLambda(
        lambdaStack,
        context.api,
        role,
        {
          username: secretEntry?.username ?? '',
          password: secretEntry?.password ?? '',
          host: secretEntry?.host ?? '',
          port: secretEntry?.port ?? '',
          database: secretEntry?.database ?? '',
        },
        context.sqlLambdaVpcConfig,
      );

      const patchingLambdaRoleStack = context.stackManager.getStackFor(RDSPatchingLambdaIAMRoleLogicalID, RDS_STACK_NAME);
      const patchingLambdaStack = context.stackManager.getStackFor(RDSPatchingLambdaLogicalID, RDS_STACK_NAME);
      const patchingLambdaRole = createRdsPatchingLambdaRole(
        context.resourceHelper.generateIAMRoleName(RDSPatchingLambdaIAMRoleLogicalID),
        patchingLambdaRoleStack,
        lambda.functionArn,
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const patchingLambda = createRdsPatchingLambda(patchingLambdaStack, context.api, patchingLambdaRole, {
        LAMBDA_FUNCTION_ARN: lambda.functionArn,
      });

      // Add SNS subscription for patching notifications
      const patchingSubscriptionStack = context.stackManager.getStackFor(RDSPatchingSubscriptionLogicalID, RDS_STACK_NAME);
      const snsTopic = Topic.fromTopicArn(patchingSubscriptionStack, 'RDSPatchingTopic', RDS_PATCHING_SNS_TOPIC_ARN);
      const subscription = new LambdaSubscription(patchingLambda, {
        filterPolicy: {
          Region: SubscriptionFilter.stringFilter({
            allowlist: [Fn.ref('AWS::Region')],
          }),
        },
      });
      snsTopic.addSubscription(subscription);

      const lambdaDataSourceStack = context.stackManager.getStackFor(RDSLambdaDataSourceLogicalID, RDS_STACK_NAME);
      const rdsDatasource = context.api.host.addLambdaDataSource(`${RDSLambdaDataSourceLogicalID}`, lambda, {}, lambdaDataSourceStack);
      this.models.forEach((model) => {
        context.dataSources.add(model, rdsDatasource);
        this.datasourceMap[model.name.value] = rdsDatasource;
      });
    }
    this.generateResolvers(context);
  }

  // eslint-disable-next-line class-methods-use-this
  getVTLGenerator(): ModelVTLGenerator {
    return new RDSModelVTLGenerator();
  }
}
