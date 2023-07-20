import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResourceConstants } from 'graphql-transformer-common';
import { MYSQL_DB_TYPE, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { ModelVTLGenerator, RDSModelVTLGenerator } from '../resolvers';
import { createRdsLambda, createRdsLambdaRole } from '../resolvers/rds';
import { ModelResourceGenerator } from './model-resource-generator';

export const RDS_STACK_NAME = 'RdsApiStack';

/**
 * An implementation of ModelResourceGenerator responsible for generated CloudFormation resources
 * for models backed by an RDS data source
 */
export class RdsModelResourceGenerator extends ModelResourceGenerator {
  protected readonly generatorType = 'RdsModelResourceGenerator';

  generateResources(context: TransformerContextProvider): void {
    if (this.isEnabled()) {
      const secretEntry = context.datasourceSecretParameterLocations.get(MYSQL_DB_TYPE);
      const { RDSLambdaIAMRoleLogicalID, RDSLambdaLogicalID, RDSLambdaDataSourceLogicalID } = ResourceConstants.RESOURCES;
      const lambdaRoleScope = context.stackManager.getScopeFor(RDSLambdaIAMRoleLogicalID, RDS_STACK_NAME);
      const lambdaScope = context.stackManager.getScopeFor(RDSLambdaLogicalID, RDS_STACK_NAME);
      const role = createRdsLambdaRole(
        context.resourceHelper.generateIAMRoleName(RDSLambdaIAMRoleLogicalID),
        lambdaRoleScope,
        secretEntry as RDSConnectionSecrets,
      );
      const lambda = createRdsLambda(lambdaScope, context.api, role, {
        username: secretEntry?.username ?? '',
        password: secretEntry?.password ?? '',
        host: secretEntry?.host ?? '',
        port: secretEntry?.port ?? '',
        database: secretEntry?.database ?? '',
      });

      const lambdaDataSourceScope = context.stackManager.getScopeFor(RDSLambdaDataSourceLogicalID, RDS_STACK_NAME);
      const rdsDatasource = context.api.host.addLambdaDataSource(`${RDSLambdaDataSourceLogicalID}`, lambda, {}, lambdaDataSourceScope);
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
