import * as path from 'path';
import * as fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import { JSONUtilities } from '@aws-amplify/amplify-cli-core';

/**
 * Detects whether a Gen1 v1->v2 GraphQL transformer migration is in progress by inspecting the
 * previously-deployed (#current-cloud-backend) API build artifacts for an
 * `AWS::AppSync::GraphQLSchema` resource whose CloudFormation logical ID is the v1 value
 * `GraphQLSchema`.
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
 * migration an in-place update.
 *
 * Layout note: v1 writes the schema resource into the API's ROOT built template
 * (`<deployedApiResourceDir>/build/cloudformation-template.json`) via `TransformFormatter`, NOT into
 * a child stack under `build/stacks/`. We therefore read the deployed build artifacts directly from
 * the #current-cloud-backend API resource dir (mirroring the established
 * `shouldEnableNodeToNodeEncryption` current-backend-state check, which reads
 * `<currentCloudBackendDir>/api/<apiName>/build/stacks`) rather than the parsed project's `stacks`
 * map, which only exposes child stacks. We scan the root template first and the child stacks as a
 * defensive fallback. The check fails open (returns false) so it can never block a deploy.
 *
 * @param deployedApiResourceDir the previously-deployed API resource directory under
 *   #current-cloud-backend (i.e. `<currentCloudBackendDir>/api/<apiName>`); this is exactly the
 *   `previouslyDeployedBackendDir` computed by the transformer options builder.
 * @returns true only when the previously-deployed template carries the schema at logical ID
 *   `GraphQLSchema`; false for born-v2 APIs, brand-new APIs with no previous deployment, or on any
 *   read/parse error.
 */
export const isMigratingFromV1SchemaLogicalId = (deployedApiResourceDir: string | undefined): boolean => {
  if (!deployedApiResourceDir) {
    return false;
  }
  const legacySchemaLogicalId = ResourceConstants.RESOURCES.GraphQLSchemaLogicalID; // 'GraphQLSchema'
  try {
    const apiBuildDir = path.join(deployedApiResourceDir, 'build');
    for (const template of readDeployedTemplates(apiBuildDir)) {
      if (templateHasLegacySchemaLogicalId(template, legacySchemaLogicalId)) {
        return true;
      }
    }
  } catch {
    // Fail open — never block a deploy on this detection.
    return false;
  }
  return false;
};

/**
 * Read every deployed CloudFormation template for the API: the ROOT template
 * (`build/cloudformation-template.json`, where v1 declares the schema) plus each child stack under
 * `build/stacks/`. Missing files/dirs yield an empty list rather than throwing.
 */
const readDeployedTemplates = (apiBuildDir: string): any[] => {
  const templates: any[] = [];

  const rootTemplatePath = path.join(apiBuildDir, 'cloudformation-template.json');
  const rootTemplate = tryReadJson(rootTemplatePath);
  if (rootTemplate) {
    templates.push(rootTemplate);
  }

  const stacksDir = path.join(apiBuildDir, 'stacks');
  try {
    for (const stackFile of fs.readdirSync(stacksDir)) {
      const stackTemplate = tryReadJson(path.join(stacksDir, stackFile));
      if (stackTemplate) {
        templates.push(stackTemplate);
      }
    }
  } catch {
    // no stacks dir — root template alone is sufficient
  }

  return templates;
};

const tryReadJson = (filePath: string): any | undefined => {
  try {
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    return JSONUtilities.readJson<any>(filePath);
  } catch {
    return undefined;
  }
};

const templateHasLegacySchemaLogicalId = (template: unknown, legacySchemaLogicalId: string): boolean => {
  const parsed = template as { Resources?: Record<string, { Type?: string }> } | undefined;
  const resource = parsed?.Resources?.[legacySchemaLogicalId];
  return resource?.Type === 'AWS::AppSync::GraphQLSchema';
};
