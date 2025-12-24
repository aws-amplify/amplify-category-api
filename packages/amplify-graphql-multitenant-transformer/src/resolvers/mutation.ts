import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MultiTenantDirectiveConfiguration } from '../types';
import { getBypassAuthTypeCheck } from '../utils/helpers';

export function generateCreateMutationRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant create mutation - Auto-assign tenantId (preAuth slot)
#if(${bypassCheck})
  #return
#end

#if($ctx.stash.allowedTenants)
  ## Lookup mode: Validate input tenantId against allowed list
  #if(!$ctx.args.input.${tenantField})
    $util.error("Unauthorized: ${tenantField} is required when multiple tenants are allowed", "Unauthorized")
  #end
  
  #if(!$ctx.stash.allowedTenants.contains($ctx.args.input.${tenantField}))
    $util.error("Unauthorized: Access denied for tenant", "Unauthorized")
  #end
#else
  ## Standard mode: Auto-assign from JWT claim
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  ## Validate tenantId exists
  #if(!$tenantId || $tenantId == "")
    $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
  #end

  ## Auto-assign tenantId to the input
  $util.qr($ctx.args.input.put("${tenantField}", $tenantId))
#end

## Return empty object - let ModelTransformer handle the actual DynamoDB operation
{}
`;
}

export function generateCreateMutationResponseTemplate(config: MultiTenantDirectiveConfiguration): string {
  return `
## Return the created item
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type, $ctx.result)
#end

$util.toJson($ctx.result)
`;
}

export function generateUpdateMutationRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant update - preAuth: Complete protection with ConditionExpression
#if(${bypassCheck})
  #return
#end

#if($ctx.stash.allowedTenants)
  ## Lookup mode: Allow update if item's tenantId is in allowed list
  #set($tenantCondition = {
    "${tenantField}": {
      "in": $ctx.stash.allowedTenants
    }
  })
  $util.qr($ctx.stash.conditions.add($tenantCondition))
#else
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  ## Validate tenantId exists
  #if(!$tenantId || $tenantId == "")
    $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
  #end

  ## Initialize conditions list if not exists
  #if(!$ctx.stash.conditions)
    $util.qr($ctx.stash.put("conditions", []))
  #end

  ## Add tenant ownership condition
  ## ModelTransformer will convert this to DynamoDB ConditionExpression
  ## This ensures the item belongs to the requester's tenant BEFORE update
  #set($tenantCondition = {
    "${tenantField}": {
      "eq": $tenantId
    }
  })
  $util.qr($ctx.stash.conditions.add($tenantCondition))
#end

## Prevent updating tenantId field (security measure)
$util.qr($ctx.args.input.remove("${tenantField}"))

{}
`;
}

export function generateUpdateMutationResponseTemplate(config: MultiTenantDirectiveConfiguration): string {
  return `
## Multi-tenant update - Response: Pre-operation validation complete
## ConditionExpression ensures only tenant-owned items can be updated
## If we reach here, the update was successful and secure
$util.toJson($ctx.result)
`;
}

export function generateDeleteMutationRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant delete - preAuth: Complete protection with ConditionExpression
#if(${bypassCheck})
  #return
#end

#if($ctx.stash.allowedTenants)
  ## Lookup mode: Allow delete if item's tenantId is in allowed list
  #set($tenantCondition = {
    "${tenantField}": {
      "in": $ctx.stash.allowedTenants
    }
  })
  $util.qr($ctx.stash.conditions.add($tenantCondition))
#else
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  ## Validate tenantId exists
  #if(!$tenantId || $tenantId == "")
    $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
  #end

  ## Initialize conditions list if not exists
  #if(!$ctx.stash.conditions)
    $util.qr($ctx.stash.put("conditions", []))
  #end

  ## Add tenant ownership condition for delete
  ## ModelTransformer will convert this to DynamoDB ConditionExpression
  ## This ensures only tenant-owned items can be deleted
  #set($tenantCondition = {
    "${tenantField}": {
      "eq": $tenantId
    }
  })
  $util.qr($ctx.stash.conditions.add($tenantCondition))
#end

{}
`;
}

export function generateDeleteMutationResponseTemplate(config: MultiTenantDirectiveConfiguration): string {
  return `
## Multi-tenant delete - Response: Pre-operation validation complete
## ConditionExpression ensures only tenant-owned items can be deleted
## If we reach here, the delete was successful and secure
$util.toJson($ctx.result)
`;
}


