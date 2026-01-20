import { MultiTenantDirectiveConfiguration } from '../types';
import { getBypassAuthTypeCheck } from '../utils/helpers';

export function generateSubscriptionRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant subscription - Validate tenantId argument
#if(${bypassCheck})
  #return
#end

#if($ctx.stash.allowedTenants)
  ## Lookup mode: Validate argument against allowed list
  #if(!$ctx.args.${tenantField})
    $util.error("Unauthorized: ${tenantField} argument is required", "Unauthorized")
  #end
  
  #if(!$ctx.stash.allowedTenants.contains($ctx.args.${tenantField}))
    $util.error("Unauthorized: Access denied for tenant", "Unauthorized")
  #end
#else
  ## Standard mode: Validate argument matches claim
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  #if(!$tenantId || $tenantId == "")
    $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
  #end

  #if($ctx.args.${tenantField} != $tenantId)
    $util.error("Unauthorized: Access denied for tenant", "Unauthorized")
  #end
#end

## Pass through
{}
`;
}
