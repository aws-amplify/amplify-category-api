import { DirectiveNode, ObjectTypeDefinitionNode } from 'graphql';

export interface MultiTenantDirectiveConfiguration {
  object: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  tenantField: string;
  tenantIdClaim: string;
  indexName?: string;
  createIndex?: boolean;
  bypassAuthTypes?: string[];
  sortKeyFields?: string[];
  projectionType?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
  projectionKeys?: string[];
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
