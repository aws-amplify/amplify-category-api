import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { getGeneratedStackGroups, walkGeneratedResourceScopes } from '../../internal/generated-stack-helpers';

type NestedStackPlacement = {
  stackName: string;
  parentId: string;
  parentIsGeneratedGroup: boolean;
};

type ResourcePlacement = {
  logicalId: string;
  type: string;
  stackName: string;
  parentId: string;
  parentIsGeneratedGroup: boolean;
};

const makePublicModelsSchema = (modelNames: string[]): string =>
  [
    'input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }',
    ...modelNames.map(
      (modelName) => /* GraphQL */ `
        type ${modelName} @model {
          id: ID!
          name: String
        }
      `,
    ),
  ].join('\n');

const makeRelationalSchema = (extraModelNames: string[] = []): string =>
  /* GraphQL */ `
    input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }

    type Blog @model {
      id: ID!
      name: String!
      posts: [Post] @hasMany(indexName: "byBlog", fields: ["id"])
    }

    type Post @model {
      id: ID!
      title: String!
      blogID: ID! @index(name: "byBlog")
      blog: Blog @belongsTo(fields: ["blogID"])
    }

    ${extraModelNames
      .map(
        (modelName) => `
          type ${modelName} @model {
            id: ID!
            name: String!
          }
        `,
      )
      .join('\n')}
  `;

const createApi = (schema: string): { app: cdk.App; rootStack: cdk.Stack; api: AmplifyGraphqlApi } => {
  const app = new cdk.App({ autoSynth: false });
  const rootStack = new cdk.Stack(app, 'RootStack');
  const api = new AmplifyGraphqlApi(rootStack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema),
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
  });

  return { app, rootStack, api };
};

const collectNestedStackPlacements = (api: AmplifyGraphqlApi): Record<string, NestedStackPlacement> => {
  const placements: Record<string, NestedStackPlacement> = {};
  const generatedGroups = new Set(getGeneratedStackGroups(api));

  Object.entries(api.resources.nestedStacks).forEach(([stackName, nestedStack]) => {
    const parent = nestedStack.node.scope as Construct;
    placements[stackName] = {
      stackName,
      parentId: parent.node.id,
      parentIsGeneratedGroup: generatedGroups.has(parent as cdk.Stack),
    };
  });

  return placements;
};

const collectResourcePlacements = (api: AmplifyGraphqlApi): ResourcePlacement[] => {
  const generatedGroups = new Set(getGeneratedStackGroups(api));
  const placements: ResourcePlacement[] = [];

  walkGeneratedResourceScopes(api, (construct) => {
    if (!(construct instanceof cdk.CfnResource)) {
      return;
    }

    const owningStack = cdk.Stack.of(construct);
    const parent = cdk.NestedStack.isNestedStack(owningStack)
      ? (owningStack.node.scope as Construct | undefined)
      : (construct.node.scope as Construct | undefined);
    placements.push({
      logicalId: construct.node.id,
      type: construct.cfnResourceType,
      stackName: owningStack.node.id,
      parentId: parent?.node.id ?? '<root>',
      parentIsGeneratedGroup: generatedGroups.has(parent as cdk.Stack) || generatedGroups.has(owningStack as cdk.Stack),
    });
  });

  return placements;
};

const statefulResourceTypes = new Set(['AWS::DynamoDB::Table', 'Custom::AmplifyDynamoDBTable']);
const apiScopedAppSyncResourceTypes = new Set([
  'AWS::AppSync::DataSource',
  'AWS::AppSync::FunctionConfiguration',
  'AWS::AppSync::GraphQLSchema',
  'AWS::AppSync::Resolver',
]);
const apiScopedAppSyncCustomResourceTypePatterns = [/^Custom::.*(AppSync|GraphQL|Resolver|DataSource|Schema)/];

const isApiScopedAppSyncResource = (resource: ResourcePlacement): boolean =>
  apiScopedAppSyncResourceTypes.has(resource.type) ||
  apiScopedAppSyncCustomResourceTypePatterns.some((pattern) => pattern.test(resource.type));

describe('update-safe generated stack placement', () => {
  it('keeps previously deployable stateful model stacks in their original parent when the schema grows', () => {
    const existingModelNames = ['ExistingA', 'ExistingB', 'ExistingC'];
    const expandedModelNames = [...existingModelNames, ...Array.from({ length: 60 }, (_, index) => `NewOverflow${index}`)];

    const baseline = createApi(makePublicModelsSchema(existingModelNames));
    const expanded = createApi(makePublicModelsSchema(expandedModelNames));

    const baselinePlacements = collectNestedStackPlacements(baseline.api);
    const expandedPlacements = collectNestedStackPlacements(expanded.api);

    existingModelNames.forEach((modelName) => {
      expect(baselinePlacements[modelName]?.parentIsGeneratedGroup).toBe(false);
      expect(expandedPlacements[modelName]?.parentIsGeneratedGroup).toBe(false);
      expect(expandedPlacements[modelName]?.parentId).toBe(baselinePlacements[modelName]?.parentId);
    });
  });

  it('does not move previously generated stateful table resources into generated stack groups', () => {
    const existingModelNames = ['ExistingA', 'ExistingB', 'ExistingC'];
    const expandedModelNames = [...existingModelNames, ...Array.from({ length: 60 }, (_, index) => `NewOverflow${index}`)];

    const baseline = createApi(makePublicModelsSchema(existingModelNames));
    const expanded = createApi(makePublicModelsSchema(expandedModelNames));

    const baselineStatefulLogicalIds = new Set(
      collectResourcePlacements(baseline.api)
        .filter((resource) => statefulResourceTypes.has(resource.type))
        .map((resource) => resource.logicalId),
    );

    collectResourcePlacements(expanded.api)
      .filter((resource) => statefulResourceTypes.has(resource.type) && baselineStatefulLogicalIds.has(resource.logicalId))
      .forEach((resource) => {
        expect(resource.parentIsGeneratedGroup).toBe(false);
      });
  });

  it('allows new overflow stacks to use generated stack groups while preserving existing stateful stacks', () => {
    const existingModelNames = ['ExistingA', 'ExistingB', 'ExistingC'];
    const newModelNames = Array.from({ length: 60 }, (_, index) => `NewOverflow${index}`);
    const expanded = createApi(makePublicModelsSchema([...existingModelNames, ...newModelNames]));

    const placements = collectNestedStackPlacements(expanded.api);

    existingModelNames.forEach((modelName) => {
      expect(placements[modelName]?.parentIsGeneratedGroup).toBe(false);
    });

    const groupedNewModelNames = newModelNames.filter((modelName) => placements[modelName]?.parentIsGeneratedGroup);
    expect(groupedNewModelNames.every((modelName) => !existingModelNames.includes(modelName))).toBe(true);
  });

  it('keeps existing non-function AppSync resources in their original parent when unrelated overflow is added', () => {
    const baseline = createApi(makeRelationalSchema());
    const expanded = createApi(makeRelationalSchema(Array.from({ length: 60 }, (_, index) => `NewOverflow${index}`)));

    const expandedApiScoped = collectResourcePlacements(expanded.api).filter(isApiScopedAppSyncResource);

    collectResourcePlacements(baseline.api)
      .filter(isApiScopedAppSyncResource)
      .forEach((baselineResource) => {
        const expandedResource = expandedApiScoped.find(
          (resource) =>
            resource.logicalId === baselineResource.logicalId &&
            resource.type === baselineResource.type &&
            resource.stackName === baselineResource.stackName,
        );
        expect(expandedResource).toBeDefined();
        expect(expandedResource?.stackName).toBe(baselineResource.stackName);
        expect(expandedResource?.parentIsGeneratedGroup).toBe(false);
      });
  });

  it('allows only new AppSync resources to appear in generated stack groups when the baseline did not contain them', () => {
    const baseline = createApi(makeRelationalSchema());
    const expanded = createApi(makeRelationalSchema(Array.from({ length: 60 }, (_, index) => `NewOverflow${index}`)));

    const baselineApiScopedIds = new Set(
      collectResourcePlacements(baseline.api)
        .filter(isApiScopedAppSyncResource)
        .map((resource) => resource.logicalId),
    );
    const expandedApiScoped = collectResourcePlacements(expanded.api).filter(isApiScopedAppSyncResource);

    const movedExisting = expandedApiScoped.filter(
      (resource) => baselineApiScopedIds.has(resource.logicalId) && resource.parentIsGeneratedGroup,
    );
    const newGroupedResources = expandedApiScoped.filter(
      (resource) => !baselineApiScopedIds.has(resource.logicalId) && resource.parentIsGeneratedGroup,
    );

    expect(movedExisting).toEqual([]);
    if (getGeneratedStackGroups(expanded.api).length > 0) {
      expect(newGroupedResources.length).toBeGreaterThan(0);
    }
  });
});
