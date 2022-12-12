import {
  directiveDefinition as modelDefinition,
  generateResolverKey,
  GenericModelTransformer,
} from '@aws-amplify/graphql-base-model-transformer';
import {
  MappingTemplate,
  SyncConfig,
} from '@aws-amplify/graphql-transformer-core';
import {
  DataSourceProvider,
  TransformerContextProvider,
  TransformerModelProvider,
  TransformerResolverProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, DirectiveDefinitionNode } from 'graphql';
import {
  createRdsLambda,
  createRdsLambdaRole,
  generateDefaultLambdaResponseMappingTemplate,
  generateLambdaRequestTemplate,
} from './resolvers/lambda';
import { ResourceConstants } from 'graphql-transformer-common';

export const directiveDefinition = modelDefinition.replace('@model', '@rdsModel');

export const RDS_STACK_NAME = 'RdsApiStack';

type RdsModelTransformerOptions = {
  EnableDeletionProtection?: boolean;
  SyncConfig?: SyncConfig;
};

/**
 * RdsModelTransformer provides similar functionality to the ModelTransformer, but for RDS
 */
export class RdsModelTransformer extends GenericModelTransformer implements TransformerModelProvider {
  private rdsLambdaDataSource?: DataSourceProvider;

  constructor(options: RdsModelTransformerOptions) {
    super('amplify-rds-model-transformer', directiveDefinition);
    this.options = this.getOptions(options);
  }

  generateResolvers(context: TransformerContextProvider): void {
    const { RDSLambdaIAMRoleLogicalID, RDSLambdaLogicalID, RDSLambdaDataSourceLogicalID } = ResourceConstants.RESOURCES;
    const lambdaRoleStack = context.stackManager.getStackFor(RDSLambdaIAMRoleLogicalID, RDS_STACK_NAME);
    const lambdaStack = context.stackManager.getStackFor(RDSLambdaLogicalID, RDS_STACK_NAME);
    const role = createRdsLambdaRole(context.resourceHelper.generateIAMRoleName(RDSLambdaIAMRoleLogicalID), lambdaRoleStack);
    const lambda = createRdsLambda(lambdaStack, context.api, role);

    const lambdaDataSourceStack = context.stackManager.getStackFor(RDSLambdaDataSourceLogicalID, RDS_STACK_NAME);
    this.rdsLambdaDataSource = context.api.host.addLambdaDataSource(
      `${RDSLambdaDataSourceLogicalID}DataSource`,
      lambda,
      { name: RDSLambdaDataSourceLogicalID },
      lambdaDataSourceStack,
    );
  }

  generateGetResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    directive?: DirectiveDefinitionNode | undefined,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        this.rdsLambdaDataSource!,
        MappingTemplate.s3MappingTemplateFromString(
          generateLambdaRequestTemplate(ctx.resourceHelper.getModelNameMapping(type.name.value), 'GET', fieldName),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(generateDefaultLambdaResponseMappingTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  }

  generateListResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    directive?: DirectiveDefinitionNode | undefined,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        this.rdsLambdaDataSource!,
        MappingTemplate.s3MappingTemplateFromString(
          generateLambdaRequestTemplate(ctx.resourceHelper.getModelNameMapping(type.name.value), 'LIST', fieldName),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(generateDefaultLambdaResponseMappingTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  }

  generateCreateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    directive?: DirectiveDefinitionNode | undefined,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        this.rdsLambdaDataSource!,
        MappingTemplate.s3MappingTemplateFromString(
          generateLambdaRequestTemplate(ctx.resourceHelper.getModelNameMapping(type.name.value), 'GET', fieldName),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(generateDefaultLambdaResponseMappingTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  }

  generateUpdateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    directive?: DirectiveDefinitionNode | undefined,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        this.rdsLambdaDataSource!,
        MappingTemplate.s3MappingTemplateFromString(
          generateLambdaRequestTemplate(ctx.resourceHelper.getModelNameMapping(type.name.value), 'GET', fieldName),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(generateDefaultLambdaResponseMappingTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  }

  generateDeleteResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    directive?: DirectiveDefinitionNode | undefined,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        this.rdsLambdaDataSource!,
        MappingTemplate.s3MappingTemplateFromString(
          generateLambdaRequestTemplate(ctx.resourceHelper.getModelNameMapping(type.name.value), 'GET', fieldName),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(generateDefaultLambdaResponseMappingTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  }

  generateSyncResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    directive?: DirectiveDefinitionNode | undefined,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        this.rdsLambdaDataSource!,
        MappingTemplate.s3MappingTemplateFromString(
          generateLambdaRequestTemplate(ctx.resourceHelper.getModelNameMapping(type.name.value), 'GET', fieldName),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(generateDefaultLambdaResponseMappingTemplate(isSyncEnabled), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  }
}
