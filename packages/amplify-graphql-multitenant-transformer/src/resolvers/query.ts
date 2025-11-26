import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MultiTenantDirectiveConfiguration } from '../types';
import { generateTenantIndexName } from '../utils/helpers';
import { generateVTL } from '../utils/helpers';
import { VTL_TENANT_VALIDATION_TEMPLATE } from '../utils/constants';

export function generateListQueryRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim } = config;
  const indexName = generateTenantIndexName(config.object.name.value, tenantField);

  return `
## Multi-tenant list query - Inject query expression into stash
#set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

#if(!$tenantId || $tenantId == "")
  $util.error("Unauthorized: tenantId claim not found", "Unauthorized")
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
  const { tenantField, tenantIdClaim } = config;

  return `
## Multi-tenant validation - Ensure item belongs to requester's tenant
#set($tenantId = $ctx.identity.claims.get("${tenantIdClaim}"))

#if($ctx.result && $ctx.result.${tenantField})
  #if($ctx.result.${tenantField} != $tenantId)
    ## Cross-tenant access attempt - return null
    $util.unauthorized()
  #end
#end

$util.toJson($ctx.result)
`;
}


