import { DirectiveNode, ObjectTypeDefinitionNode } from 'graphql';

export interface MultiTenantDirectiveConfiguration {
  object: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  tenantField: string;
  tenantIdClaim: string;
}

export enum MultiTenantError {
  TENANT_ID_MISSING = 'TENANT_ID_MISSING',
  CROSS_TENANT_ACCESS = 'CROSS_TENANT_ACCESS',
  INVALID_TENANT_CLAIM = 'INVALID_TENANT_CLAIM',
  MISSING_MODEL_DIRECTIVE = 'MISSING_MODEL_DIRECTIVE',
}

export interface MultiTenantMetadata {
  typeName: string;
  tenantField: string;
  tenantIdClaim: string;
  hasIndex: boolean;
  indexName: string;
}
