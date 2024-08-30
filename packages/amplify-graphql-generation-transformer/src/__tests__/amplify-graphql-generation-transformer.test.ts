import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
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
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "Make a list of todo items based on the description."
        )
        @auth(rules: [{ allow: public, provider: iam }])
    }
  `;

  // Models are not currently supported for generation routes.
  // This test can fail on `createdAt` or `updatedAt` fields. Hence the generalized error message assertion.
  expect(() => transform(inputSchema)).toThrow(/Disallowed required field type/);
});

test('generation route scalar type', () => {
  const queryName = 'makeTodo';
  const inputSchema = `
    type Query {
        ${queryName}(description: String!): String
        @generation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "Make a string based on the description.",
        )
        @auth(rules: [{ allow: public, provider: iam }])
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
      meal: Meal
    }

    enum Meal {
      BREAKFAST
      LUNCH
      DINNER
    }

    type Query {
        ${queryName}(description: String!): Recipe
        @generation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
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

test('generation route model type with null timestamps', () => {
  const queryName = 'makeTodo';
  const inputSchema = `
    type Todo @model(timestamps: {createdAt: null, updatedAt: null}) {
      content: String
      isDone: Boolean
    }

    type Query {
        ${queryName}(description: String!): Todo
        @generation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "Make a string based on the description.",
        )
    }
  `;
  const out = transform(inputSchema, {
    Todo: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  });

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
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "Make a string based on the description.",
        )
    }
  `;

  // Models are not currently supported for generation routes.
  // This test can fail on `createdAt` or `updatedAt` fields. Hence the generalized error message assertion.
  expect(() => transform(inputSchema)).toThrow(/Disallowed required field type/);
});

test('generation route invalid field type in response type', () => {
  const inputSchema = `
    union Foo = Bar | Baz
    type Bar {
      value: String
    }

    type Baz {
      value: Int
    }

    type Query {
        makeFoo(description: String!): Foo
        @generation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "",
        )
    }
  `;

  expect(() => transform(inputSchema)).toThrow('Unsupported type definition: UnionTypeDefinition');
});

test('generation route invalid parent type', () => {
  const inputSchema = `
    type Thing {
      int: Int
    }

    type Mutation {
      makeThing(description: String!): Thing
      @generation(
        aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
        systemPrompt: "",
      )
    }
  `;

  expect(() => transform(inputSchema)).toThrow('@generation directive must be used on Query field.');
});

test('generation route all scalar types', () => {
  const queryName = 'makeBox';
  const inputSchema = `
    type Box {
      int: Int
      float: Float
      string: String
      id: ID
      boolean: Boolean
      awsjson: AWSJSON
      awsemail: AWSEmail
      awsdate: AWSDate
      awstime: AWSTime
      awsdatetime: AWSDateTime
      awstimestamp: AWSTimestamp
      awsphone: AWSPhone
      awsurl: AWSURL
      awsipaddress: AWSIPAddress
    }

    type Query {
        makeBox(description: String!): Box
        @generation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "",
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

describe('generation route invalid inference configuration', () => {
  const maxTokens = 'inferenceConfiguration: { maxTokens: 0 }';
  const temperature = 'inferenceConfiguration: { temperature: 1.1 }';
  const topP = 'inferenceConfiguration: { topP: -2 }';

  const generationRoute = (invalidInferenceConfig: string): string => {
    return `
      type Query {
          generate(description: String!): String
          @generation(
            aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
            systemPrompt: "Make a string based on the description.",
            ${invalidInferenceConfig}
          )
      }
    `;
  };

  test('maxTokens invalid', () => {
    expect(() => transform(generationRoute(maxTokens))).toThrow(
      '@generation directive maxTokens valid range: Minimum value of 1. Provided: 0',
    );
  });

  test('temperature invalid', () => {
    expect(() => transform(generationRoute(temperature))).toThrow(
      '@generation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
    );
  });

  test('topP invalid', () => {
    expect(() => transform(generationRoute(topP))).toThrow(
      '@generation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: -2',
    );
  });
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

function transform(
  inputSchema: string,
  dataSourceStrategies?: Record<string, ModelDataSourceStrategy>,
  authConfig: AppSyncAuthConfiguration = defaultAuthConfig,
): DeploymentResources {
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

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies,
  });

  return out;
}
