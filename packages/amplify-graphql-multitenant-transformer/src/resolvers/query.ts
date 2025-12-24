import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MultiTenantDirectiveConfiguration } from '../types';
import { generateTenantIndexName } from '../utils/helpers';
import { generateVTL } from '../utils/helpers';
import { VTL_TENANT_VALIDATION_TEMPLATE } from '../utils/constants';
import { getBypassAuthTypeCheck } from '../utils/helpers';

export function generateListQueryRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const indexName = config.indexName || generateTenantIndexName(config.object.name.value, tenantField);
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant list query - Inject query expression into stash
#if(${bypassCheck})
  #return
#end

#set($isMultiTenant = false)
#if($ctx.stash.allowedTenants)
   #set($allowed = $ctx.stash.allowedTenants)
   #set($isMultiTenant = true)
#elseif($util.isList($ctx.identity.claims.get("${tenantIdClaim}")))
   #set($allowed = $ctx.identity.claims.get("${tenantIdClaim}"))
   #set($isMultiTenant = true)
#end

#if($isMultiTenant)
   ## Look for tenantId in filter
   #set($requestedTenant = $util.defaultIfNull($ctx.args.filter.${tenantField}.eq, null))

   #if(!$requestedTenant)
      $util.error("Please provide a specific '${tenantField}' in the filter when you have access to multiple tenants.")
   #end

   #if(!$allowed.contains($requestedTenant))
      $util.error("Unauthorized: Access denied for tenant $requestedTenant")
   #end

   #set($tenantId = $requestedTenant)
#else
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  #if(!$tenantId || $tenantId == "")
    $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
  #end
#end

## Create the tenant query expression
#set($ModelQueryExpression = {
  "expression": "#${tenantField} = :${tenantField}",
  "expressionNames": {
    "#${tenantField}": "${tenantField}"
  },
  "expressionValues": {
    ":${tenantField}": $util.dynamodb.toDynamoDBJson($tenantId)
  }
})

## Store index name and query expression in stash for the model resolver to use
$util.qr($ctx.stash.put("metadata", {}))
$util.qr($ctx.stash.metadata.put("index", "${indexName}"))
$util.qr($ctx.stash.put("modelQueryExpression", $ModelQueryExpression))

## Return empty object - the model resolver will handle the actual request
{}
`;
}

export function generateListQueryResponseTemplate(config: MultiTenantDirectiveConfiguration): string {
  return `
## Return the query results
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type, $ctx.result)
#end

$util.toJson($ctx.result)
`;
}

export function generateGetQueryRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  return `
## Multi-tenant get query - Will validate in response
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": #if($ctx.stash.metadata.modelObjectKey) $ctx.stash.metadata.modelObjectKey #else {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  } #end
}
`;
}

export function generateGetQueryResponseTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant validation - Ensure item belongs to requester's tenant
#if(${bypassCheck})
  #return($util.toJson($ctx.result))
#end

#if($ctx.stash.allowedTenants)
  #if($ctx.result && $ctx.result.${tenantField})
    #if(!$ctx.stash.allowedTenants.contains($ctx.result.${tenantField}))
      ## Cross-tenant access attempt - return null
      $util.unauthorized()
    #end
  #end
#else
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  #if($ctx.result && $ctx.result.${tenantField})
    #if($ctx.result.${tenantField} != $tenantId)
      ## Cross-tenant access attempt - return null
      $util.unauthorized()
    #end
  #end
#end

$util.toJson($ctx.result)
`;
}

export function generateTenantFilterTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim, bypassAuthTypes } = config;
  const bypassCheck = getBypassAuthTypeCheck(bypassAuthTypes);

  return `
## Multi-tenant filter - Inject tenant filter into stash
#if(${bypassCheck})
  #return
#end

#set($isMultiTenant = false)
#if($ctx.stash.allowedTenants)
   #set($allowed = $ctx.stash.allowedTenants)
   #set($isMultiTenant = true)
#elseif($util.isList($ctx.identity.claims.get("${tenantIdClaim}")))
   #set($allowed = $ctx.identity.claims.get("${tenantIdClaim}"))
   #set($isMultiTenant = true)
#end

#if($isMultiTenant)
   ## Look for tenantId in filter
   #set($requestedTenant = $util.defaultIfNull($ctx.args.filter.${tenantField}.eq, null))

   #if(!$requestedTenant)
      $util.error("Please provide a specific '${tenantField}' in the filter when you have access to multiple tenants.")
   #end

   #if(!$allowed.contains($requestedTenant))
      $util.error("Unauthorized: Access denied for tenant $requestedTenant")
   #end

   #set($tenantId = $requestedTenant)
#else
  #set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

  #if(!$tenantId || $tenantId == "")
    $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
  #end
#end

#set($tenantFilter = { "${tenantField}": { "eq": $tenantId } })

#if( !$util.isNullOrEmpty($ctx.stash.authFilter) )
  #set( $ctx.stash.authFilter = { "and": [$ctx.stash.authFilter, $tenantFilter] } )
#else
  #set( $ctx.stash.authFilter = $tenantFilter )
#end
`;
}


