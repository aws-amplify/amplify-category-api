import { Directive } from './directive';

const name = 'multiTenant';
const definition = /* GraphQL */ `
  directive @${name}(
      tenantField: String = "tenantId"
      tenantIdClaim: String = "custom:tenantId"
      createIndex: Boolean = true
      indexName: String
      bypassAuthTypes: [String]
      sortKeyFields: [String]
      projectionType: String
      projectionKeys: [String]
      lookupModel: String
      lookupKey: String
      lookupClaim: String
      lookupOutputField: String
    ) on OBJECT`;
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
