import { Directive } from './directive';

const name = 'multiTenant';
const definition = /* GraphQL */ `
  directive @${name}(
    tenantField: String = "tenantId"
    tenantIdClaim: String = "custom:tenantId"
    indexName: String
    createIndex: Boolean = true
    bypassAuthTypes: [String]
    sortKeyFields: [String]
  ) on OBJECT
`;
const defaults = {
  tenantField: 'tenantId',
  tenantIdClaim: 'custom:tenantId',
  createIndex: true,
};

export const MultiTenantDirective: Directive = {
  name,
  definition,
  defaults,
};
