import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResourceConstants } from 'graphql-transformer-common';
import { ModelResourceGenerator } from './model-resource-generator';
import { ModelVTLGenerator, RDSModelVTLGenerator } from '../resolvers';
import { createRdsLambda, createRdsLambdaRole } from '../resolvers/rds';

export const RDS_STACK_NAME = 'RdsApiStack';

/**
 * An implementation of ModelResourceGenerator responsible for generated CloudFormation resources
 * for models backed by an RDS data source
 */
export class RdsModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'RdsModelResourceGenerator';

  generateResources(context: TransformerContextProvider): void {
    const { RDSLambdaIAMRoleLogicalID, RDSLambdaLogicalID, RDSLambdaDataSourceLogicalID } = ResourceConstants.RESOURCES;
    const lambdaRoleStack = context.stackManager.getStackFor(RDSLambdaIAMRoleLogicalID, RDS_STACK_NAME);
    const lambdaStack = context.stackManager.getStackFor(RDSLambdaLogicalID, RDS_STACK_NAME);
    const role = createRdsLambdaRole(context.resourceHelper.generateIAMRoleName(RDSLambdaIAMRoleLogicalID), lambdaRoleStack);
    const lambda = createRdsLambda(lambdaStack, context.api, role);

    const lambdaDataSourceStack = context.stackManager.getStackFor(RDSLambdaDataSourceLogicalID, RDS_STACK_NAME);
    const rdsDatasource = context.api.host.addLambdaDataSource(
      `${RDSLambdaDataSourceLogicalID}DataSource`,
      lambda,
      { name: RDSLambdaDataSourceLogicalID },
      lambdaDataSourceStack,
    );
  }

  // eslint-disable-next-line class-methods-use-this
  getVTLGenerator(): ModelVTLGenerator {
    return new RDSModelVTLGenerator();
  }
}
