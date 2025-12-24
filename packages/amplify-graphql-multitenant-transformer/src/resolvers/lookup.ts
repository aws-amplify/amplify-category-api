import { MultiTenantDirectiveConfiguration } from '../types';

export function generateLookupRequestTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { lookupKey, lookupClaim } = config;
  return `
## Multi-tenant lookup - Fetch allowed tenants
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "${lookupKey}": $util.dynamodb.toDynamoDBJson($ctx.identity.claims.get("${lookupClaim}"))
  }
}
  `;
}

export function generateLookupResponseTemplate(config: MultiTenantDirectiveConfiguration): string {
  const { lookupOutputField } = config;
  return `
## Multi-tenant lookup - Stash allowed tenants
#if($ctx.result)
  $util.qr($ctx.stash.put("allowedTenants", $ctx.result.${lookupOutputField}))
#end
$util.toJson($ctx.result)
  `;
}
