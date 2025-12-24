import { ObjectTypeDefinitionNode } from 'graphql';
import { getBaseType } from 'graphql-transformer-common';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MultiTenantDirectiveConfiguration } from '../types';
import {
  generateListQueryRequestTemplate,
  generateListQueryResponseTemplate,
  generateGetQueryRequestTemplate,
  generateGetQueryResponseTemplate,
  generateTenantFilterTemplate,
} from './query';
import {
  generateCreateMutationRequestTemplate,
  generateCreateMutationResponseTemplate,
  generateUpdateMutationRequestTemplate,
  generateUpdateMutationResponseTemplate,
  generateDeleteMutationRequestTemplate,
  generateDeleteMutationResponseTemplate,
} from './mutation';
import { generateSubscriptionRequestTemplate } from './subscription';
import { generateLookupRequestTemplate, generateLookupResponseTemplate } from './lookup';

export function applyMultiTenantResolvers(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
  usesPrimaryKeyWithTenantId: boolean = false,
): void {
  const typeName = config.object.name.value;

  applyQueryResolvers(config, context, typeName, usesPrimaryKeyWithTenantId);
  applyMutationResolvers(config, context, typeName, usesPrimaryKeyWithTenantId);
  applySubscriptionResolvers(config, context, typeName);
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
  if (getResolver) {
    if (!usesPrimaryKeyWithTenantId) {
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
          `Query.${getFieldName}.multiTenant.req.vtl`,
        );
        const responseTemplate = MappingTemplate.s3MappingTemplateFromString(
          responseTemplateStr,
          `Query.${getFieldName}.multiTenant.res.vtl`,
        );

      getResolver.addVtlFunctionToSlot(
        'auth',
        MappingTemplate.s3MappingTemplateFromString('{}', `Query.${getFieldName}.auth.req.vtl`),
        responseTemplate,
      );
    } else {
      // If using primary key, we still need to validate the result in the response
      // to ensure the tenantId matches the requester's tenant.
      const responseTemplateStr = generateGetQueryResponseTemplate(config);
      const responseTemplate = MappingTemplate.s3MappingTemplateFromString(
        responseTemplateStr,
        `Query.${getFieldName}.multiTenant.res.vtl`,
      );

      getResolver.addVtlFunctionToSlot(
        'auth',
        MappingTemplate.s3MappingTemplateFromString('{}', `Query.${getFieldName}.auth.req.vtl`),
        responseTemplate,
      );
    }
  }

  // Iterate over all Query fields to protect secondary indexes and custom queries
  const queryType = context.output.getType('Query') as ObjectTypeDefinitionNode;
  if (queryType) {
    const fields = queryType.fields || [];
    const connectionTypeName = `Model${typeName}Connection`;
    
    for (const field of fields) {
      const fieldName = field.name.value;
      const returnType = getBaseType(field.type);
      
      // Check if it returns a connection to our type or the type itself (list)
      if (returnType === connectionTypeName || returnType === typeName || returnType === `[${typeName}]`) {
         // Skip if it is the default list query (handled separately below with optimization)
         if (fieldName === listFieldName) continue;
         
         // Skip if it is the default get query (handled above)
         if (fieldName === getFieldName) continue;

         const resolver = context.resolvers.getResolver('Query', fieldName);
         if (resolver) {
            // Inject tenant filter into preAuth slot
            // This ensures ctx.stash.authFilter is populated with tenant check
            const filterTemplate = generateTenantFilterTemplate(config);
            resolver.addVtlFunctionToSlot(
                'preAuth',
                MappingTemplate.s3MappingTemplateFromString(filterTemplate, `Query.${fieldName}.tenantFilter.req.vtl`)
            );
         }
      }
    }
  }

  const listResolver = context.resolvers.getResolver('Query', listFieldName);
  if (listResolver) {
    if (config.lookupModel) {
      const dataSource = context.api.host.getDataSource(`${config.lookupModel}Table`);
      if (dataSource) {
        const lookupRequest = generateLookupRequestTemplate(config);
        const lookupResponse = generateLookupResponseTemplate(config);
        
        listResolver.addVtlFunctionToSlot(
          'preAuth',
          MappingTemplate.s3MappingTemplateFromString(lookupRequest, `Query.${listFieldName}.lookup.req.vtl`),
          MappingTemplate.s3MappingTemplateFromString(lookupResponse, `Query.${listFieldName}.lookup.res.vtl`),
          dataSource as any
        );
      }
    }

    const requestTemplateStr = generateListQueryRequestTemplate(config);
    const requestTemplate = MappingTemplate.s3MappingTemplateFromString(
      requestTemplateStr,
      `Query.${listFieldName}.multiTenant.req.vtl`,
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

function applySubscriptionResolvers(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
  typeName: string,
): void {
  const ops = ['onCreate', 'onUpdate', 'onDelete'];
  
  for (const op of ops) {
    const fieldName = `${op}${typeName}`;
    const resolver = context.resolvers.getResolver('Subscription', fieldName);
    
    if (resolver) {
      if (config.lookupModel) {
        const dataSource = context.api.host.getDataSource(`${config.lookupModel}Table`);
        if (dataSource) {
            const lookupRequest = generateLookupRequestTemplate(config);
            const lookupResponse = generateLookupResponseTemplate(config);
            
            resolver.addVtlFunctionToSlot(
              'preAuth',
              MappingTemplate.s3MappingTemplateFromString(lookupRequest, `Subscription.${fieldName}.lookup.req.vtl`),
              MappingTemplate.s3MappingTemplateFromString(lookupResponse, `Subscription.${fieldName}.lookup.res.vtl`),
              dataSource as any
            );
        }
      }
      
      const requestTemplateStr = generateSubscriptionRequestTemplate(config);
      resolver.addVtlFunctionToSlot(
        'preAuth',
        MappingTemplate.s3MappingTemplateFromString(requestTemplateStr, `Subscription.${fieldName}.tenant.req.vtl`)
      );
    }
  }
}
