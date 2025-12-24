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
import { generateLookupRequestTemplate, generateLookupResponseTemplate } from './lookup';

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
    if (config.lookupModel) {
      const dataSource = context.api.host.getDataSource(`${config.lookupModel}Table`);
      if (dataSource) {
        const lookupRequest = generateLookupRequestTemplate(config);
        const lookupResponse = generateLookupResponseTemplate(config);
        
        getResolver.addVtlFunctionToSlot(
          'preAuth',
          MappingTemplate.s3MappingTemplateFromString(lookupRequest, `Query.${getFieldName}.lookup.req.vtl`),
          MappingTemplate.s3MappingTemplateFromString(lookupResponse, `Query.${getFieldName}.lookup.res.vtl`),
          dataSource as any
        );
      }
    }

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
    // If lookup is configured, add the lookup function first
    if (config.lookupModel) {
      const dataSource = context.api.host.getDataSource(`${config.lookupModel}Table`);
      if (dataSource) {
        const lookupRequest = generateLookupRequestTemplate(config);
        const lookupResponse = generateLookupResponseTemplate(config);
        
        createResolver.addVtlFunctionToSlot(
          'preAuth',
          MappingTemplate.s3MappingTemplateFromString(lookupRequest, `Mutation.${createFieldName}.lookup.req.vtl`),
          MappingTemplate.s3MappingTemplateFromString(lookupResponse, `Mutation.${createFieldName}.lookup.res.vtl`),
          dataSource as any
        );
      }
    }

    const requestTemplateStr = generateCreateMutationRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Mutation.${createFieldName}.preAuth.req.vtl`,
    );
    createResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }

  const updateResolver = context.resolvers.getResolver('Mutation', updateFieldName);
  if (updateResolver) {
    if (config.lookupModel) {
      const dataSource = context.api.host.getDataSource(`${config.lookupModel}Table`);
      if (dataSource) {
        const lookupRequest = generateLookupRequestTemplate(config);
        const lookupResponse = generateLookupResponseTemplate(config);
        
        updateResolver.addVtlFunctionToSlot(
          'preAuth',
          MappingTemplate.s3MappingTemplateFromString(lookupRequest, `Mutation.${updateFieldName}.lookup.req.vtl`),
          MappingTemplate.s3MappingTemplateFromString(lookupResponse, `Mutation.${updateFieldName}.lookup.res.vtl`),
          dataSource as any
        );
      }
    }

    const requestTemplateStr = generateUpdateMutationRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Mutation.${updateFieldName}.preAuth.req.vtl`,
    );
    updateResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }

  const deleteResolver = context.resolvers.getResolver('Mutation', deleteFieldName);
  if (deleteResolver) {
    if (config.lookupModel) {
      const dataSource = context.api.host.getDataSource(`${config.lookupModel}Table`);
      if (dataSource) {
        const lookupRequest = generateLookupRequestTemplate(config);
        const lookupResponse = generateLookupResponseTemplate(config);
        
        deleteResolver.addVtlFunctionToSlot(
          'preAuth',
          MappingTemplate.s3MappingTemplateFromString(lookupRequest, `Mutation.${deleteFieldName}.lookup.req.vtl`),
          MappingTemplate.s3MappingTemplateFromString(lookupResponse, `Mutation.${deleteFieldName}.lookup.res.vtl`),
          dataSource as any
        );
      }
    }

    const requestTemplateStr = generateDeleteMutationRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Mutation.${deleteFieldName}.preAuth.req.vtl`,
    );
    deleteResolver.addVtlFunctionToSlot('preAuth', requestTemplate);
  }
}
