export const DEFAULT_TENANT_FIELD = 'tenantId';
export const DEFAULT_TENANT_ID_CLAIM = 'custom:tenantId';

export const TENANT_INDEX_PREFIX = 'byTenant';
export const TENANT_INDEX_SORT_KEY = 'createdAt';

export const VTL_TENANT_VALIDATION_TEMPLATE = `
## Multi-tenant validation - Extract tenantId from JWT claims
#set($tenantId = $ctx.identity.claims.get("{{tenantIdClaim}}"))

## Ensure tenantId exists
#if(!$tenantId || $tenantId == "")
  $util.error("Unauthorized: tenantId claim not found", "{{errorType}}")
#end
`;

export const VTL_CROSS_TENANT_CHECK_TEMPLATE = `
## Cross-tenant access prevention
#set($tenantId = $ctx.identity.claims.get("{{tenantIdClaim}}"))
#set($item = $ctx.result)

#if($item && $item.{{tenantField}} && $item.{{tenantField}} != $tenantId)
  $util.error("Unauthorized: Cross-tenant access denied", "Unauthorized")
#end
`;

export const VTL_QUERY_TENANT_FILTER_TEMPLATE = `
## Apply tenant filter to query
#set($tenantId = $ctx.identity.claims.get("{{tenantIdClaim}}"))

#if(!$tenantId || $tenantId == "")
  $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
#end

## Set tenant filter in query expression
`;
