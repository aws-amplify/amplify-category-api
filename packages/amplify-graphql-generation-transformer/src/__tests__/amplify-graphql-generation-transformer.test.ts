import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, GraphQLTransform, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse, print } from 'graphql';
import { GenerationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';

const todoModel = `
type Todo @model {
  content: String
  isDone: Boolean
}`;

test('generation route model list response type', () => {
  const queryName = 'makeTodos';
  const inputSchema = `
    ${todoModel}

    type Query {
        ${queryName}(description: String!): [Todo]
        @generation(
          aiModel: "Claude3Haiku",
          systemPrompt: "Make a list of todo items based on the description.",
        )
        @auth(rules: [{ allow:  public, provider: iam}])
    }
  `;
  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolverCode = getResolverResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('generation route scalar type', () => {
  const queryName = 'makeTodo';
  const inputSchema = `
    type Query {
        ${queryName}(description: String!): String
        @generation(
          aiModel: "Claude3Haiku",
          systemPrompt: "Make a string based on the description.",
        )
    }
  `;
  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolverCode = getResolverResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('generation route custom query', () => {
  const queryName = 'generateRecipe';
  const inputSchema = `
    type Recipe {
      name: String
      ingredients: [String]
      instructions: String
    }

    type Query {
        ${queryName}(description: String!): Recipe
        @generation(
          aiModel: "Claude3Haiku",
          systemPrompt: "You are a helpful assistant that generates recipes.",
        )
    }
  `;
  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolverCode = getResolverResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('generation route model type', () => {
  const queryName = 'makeTodo';
  const inputSchema = `
    ${todoModel}

    type Query {
        ${queryName}(description: String!): Todo
        @generation(
          aiModel: "Claude3Haiku",
          systemPrompt: "Make a string based on the description.",
        )
    }
  `;
  const out = transform(inputSchema);

  const resolverCode = getResolverResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('generation route required model type required field', () => {
  const queryName = 'makeTodo';
  const inputSchema = `
    ${todoModel}

    type Query {
        ${queryName}(description: String!): Todo!
        @generation(
          aiModel: "Claude3Haiku",
          systemPrompt: "Make a string based on the description.",
        )
    }
  `;
  const out = transform(inputSchema);

  const resolverCode = getResolverResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(queryName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

const getResolverResource = (queryName: string, resources?: Record<string, any>): Record<string, any> => {
  const resolverName = `Query${queryName}Resolver`;
  return resources?.[resolverName];
};

const getResolverFnResource = (queryName: string, resources?: Record<string, any>): Record<string, any> => {
  const capitalizedQueryName = queryName.charAt(0).toUpperCase() + queryName.slice(1);
  const resourcePrefix = `Query${capitalizedQueryName}DataResolverFn`;
  if (!resources) {
    fail('No resources found.');
  }
  const resource = Object.entries(resources).find(([key, _]) => {
    return key.startsWith(resourcePrefix);
  })?.[1];

  if (!resource) {
    fail(`Resource named with prefix ${resourcePrefix} not found.`);
  }
  return resource;
};

const defaultAuthConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AWS_IAM',
  },
  additionalAuthenticationProviders: [],
};

function transform(inputSchema: string, authConfig: AppSyncAuthConfiguration = defaultAuthConfig): DeploymentResources {
  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const belongsToTransformer = new BelongsToTransformer();
  const hasManyTransformer = new HasManyTransformer();

  const transformers = [
    modelTransformer,
    new PrimaryKeyTransformer(),
    indexTransformer,
    hasManyTransformer,
    hasOneTransformer,
    belongsToTransformer,
    new GenerationTransformer(),
    authTransformer,
  ];

  // const processed = new GraphQLTransform({ transformers }).preProcessSchema(parse(inputSchema));
  // console.log(print(processed))

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies: {
      Todo: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    },
  });

  return out;
}