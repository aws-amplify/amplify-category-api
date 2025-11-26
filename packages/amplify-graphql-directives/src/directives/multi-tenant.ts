import { Directive } from './directive';

const name = 'multiTenant';
const definition = /* GraphQL */ `
  directive @${name}(
    tenantField: String = "tenantId"
    tenantIdClaim: String = "custom:tenantId"
  ) on OBJECT
`;
const defaults = {
  tenantField: 'tenantId',
  tenantIdClaim: 'custom:tenantId',
};

export const MultiTenantDirective: Directive = {
  name,
  definition,
  defaults,
};
