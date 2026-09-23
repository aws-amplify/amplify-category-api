import { ResourceConstants } from 'graphql-transformer-common';

/**
 * Detects whether a Gen1 v1->v2 GraphQL transformer migration is in progress by inspecting the
 * previously-deployed (current-cloud) project for an `AWS::AppSync::GraphQLSchema` resource whose
 * CloudFormation logical ID is the v1 value `GraphQLSchema`.
 *
 * Why this matters: the v1 transformer emits the schema resource at logical ID `GraphQLSchema`,
 * while the v2 transformer emits it at the CDK-generated `GraphQLAPITransformerSchema<hash>`. The
 * AppSync schema physical ID is deterministic (`<apiId>GraphQLSchema`, one schema per API), so a
 * logical-ID rename during a v1->v2 migration makes CloudFormation attempt a create-before-delete
 * in which the new and old resources resolve to the same physical ID, failing with
 * `<apiId>GraphQLSchema already exists in stack`.
 *
 * When this returns true, the caller sets `preserveGraphQLSchemaLogicalId` on the transform
 * parameters so the v2 transformer pins the schema logical ID back to `GraphQLSchema`, making the
 * migration an in-place update. The check is deliberately conservative: a born-v2 API (or a brand
 * new API with no previous deployment) does NOT carry the schema at `GraphQLSchema`, so it returns
 * false and the default (hashed) logical ID is preserved, leaving those projects unchanged.
 *
 * @param lastDeployedProjectConfig the project config loaded from the current-cloud backend dir via
 *   `loadProject`, or undefined when there is no previous deployment.
 * @returns true only when the previously-deployed template carries the schema at logical ID
 *   `GraphQLSchema`.
 */
export const isMigratingFromV1SchemaLogicalId = (lastDeployedProjectConfig: unknown): boolean => {
  const legacySchemaLogicalId = ResourceConstants.RESOURCES.GraphQLSchemaLogicalID; // 'GraphQLSchema'
  const config = lastDeployedProjectConfig as
    | { stacks?: Record<string, unknown>; build?: { stacks?: Record<string, string | Record<string, unknown>> } }
    | undefined;
  if (!config) {
    return false;
  }

  // The built, previously-deployed nested stack templates live under build.stacks as a map of
  // stack-file-name -> template (JSON string or already-parsed object). The AppSync API nested
  // stack is where the GraphQLSchema resource is declared.
  const builtStacks = config.build?.stacks ?? {};
  for (const stackTemplate of Object.values(builtStacks)) {
    if (templateHasLegacySchemaLogicalId(stackTemplate, legacySchemaLogicalId)) {
      return true;
    }
  }

  // Fallback: some load paths expose the (unbuilt) stacks map directly.
  const stacks = config.stacks ?? {};
  for (const stackTemplate of Object.values(stacks)) {
    if (templateHasLegacySchemaLogicalId(stackTemplate, legacySchemaLogicalId)) {
      return true;
    }
  }

  return false;
};

const templateHasLegacySchemaLogicalId = (template: unknown, legacySchemaLogicalId: string): boolean => {
  let parsed: { Resources?: Record<string, { Type?: string }> } | undefined;
  if (typeof template === 'string') {
    try {
      parsed = JSON.parse(template);
    } catch {
      return false;
    }
  } else if (template && typeof template === 'object') {
    parsed = template as { Resources?: Record<string, { Type?: string }> };
  }

  const resource = parsed?.Resources?.[legacySchemaLogicalId];
  return resource?.Type === 'AWS::AppSync::GraphQLSchema';
};
