import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MultiTenantDirectiveConfiguration } from '../types';
import {
  generateListQueryRequestTemplate,
  generateListQueryResponseTemplate,
  generateGetQueryRequestTemplate,
  generateGetQueryResponseTemplate,
} from './query';
import {
  generateCreateMutationRequestTemplate,
  generateCreateMutationResponseTemplate,
  generateUpdateMutationRequestTemplate,
  generateUpdateMutationResponseTemplate,
  generateDeleteMutationRequestTemplate,
  generateDeleteMutationResponseTemplate,
} from './mutation';

export function applyMultiTenantResolvers(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
  usesPrimaryKeyWithTenantId: boolean = false,
): void {
  const typeName = config.object.name.value;

  applyQueryResolvers(config, context, typeName, usesPrimaryKeyWithTenantId);
  applyMutationResolvers(config, context, typeName, usesPrimaryKeyWithTenantId);
}

function applyQueryResolvers(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
  typeName: string,
  usesPrimaryKeyWithTenantId: boolean,
): void {
  const getFieldName = `get${typeName}`;
  const listFieldName = `list${typeName}s`;

  const getResolver = context.resolvers.getResolver('Query', getFieldName);
  if (getResolver && !usesPrimaryKeyWithTenantId) {
    const requestTemplateStr = generateGetQueryRequestTemplate(config);
    const responseTemplateStr = generateGetQueryResponseTemplate(config);
      
      const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
        requestTemplateStr,
        `Query.${getFieldName}.req.vtl`,
      );
      const responseTemplate = MappingTemplate.s3MappingTemplateFromString(
        responseTemplateStr,
        `Query.${getFieldName}.res.vtl`,
      );

    getResolver.addVtlFunctionToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString('{}', `Query.${getFieldName}.auth.req.vtl`),
      responseTemplate,
    );
  }

  const listResolver = context.resolvers.getResolver('Query', listFieldName);
  if (listResolver) {
    const requestTemplateStr = generateListQueryRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Query.${listFieldName}.req.vtl`,
    );
    listResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }
}

function applyMutationResolvers(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
  typeName: string,
  usesPrimaryKeyWithTenantId: boolean,
): void {
  const createFieldName = `create${typeName}`;
  const updateFieldName = `update${typeName}`;
  const deleteFieldName = `delete${typeName}`;

  const createResolver = context.resolvers.getResolver('Mutation', createFieldName);
  if (createResolver) {
    const requestTemplateStr = generateCreateMutationRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Mutation.${createFieldName}.preAuth.req.vtl`,
    );
    createResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }

  const updateResolver = context.resolvers.getResolver('Mutation', updateFieldName);
  if (updateResolver) {
    const requestTemplateStr = generateUpdateMutationRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Mutation.${updateFieldName}.preAuth.req.vtl`,
    );
    updateResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }

  const deleteResolver = context.resolvers.getResolver('Mutation', deleteFieldName);
  if (deleteResolver) {
    const requestTemplateStr = generateDeleteMutationRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Mutation.${deleteFieldName}.preAuth.req.vtl`,
    );
    deleteResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }
}
