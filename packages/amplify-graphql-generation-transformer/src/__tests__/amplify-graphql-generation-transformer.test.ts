import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { GenerationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';

jest.mock(
  '../../package.json',
  () => ({
    version: '0.0.0',
  }),
  { virtual: true },
);

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

  const resolvers = out.resolvers;
  expect(resolvers).toBeDefined();
  expect(resolvers).toMatchSnapshot();

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

  const resolvers = out.resolvers;
  expect(resolvers).toBeDefined();
  expect(resolvers).toMatchSnapshot();

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

  const resolverFn = out.resolvers['makeTodo-invoke-bedrock-fn'];
  expect(resolverFn).toBeDefined();
  expect(resolverFn).toMatchSnapshot();

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

  const resolvers = out.resolvers;
  expect(resolvers).toBeDefined();
  expect(resolvers).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('generation route with valid inference configuration', () => {
  const queryName = 'generateWithConfig';
  const inputSchema = `
    type Query {
        ${queryName}(description: String!): String
        @generation(
          aiModel: "anthropic.claude-3-haiku-20240307-v1:0",
          systemPrompt: "Generate a string based on the description.",
          inferenceConfiguration: {
            maxTokens: 100,
            temperature: 0.7,
            topP: 0.9
          }
        )
    }
  `;

  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolvers = out.resolvers;
  expect(resolvers).toBeDefined();
  expect(resolvers).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

describe('generation route invalid inference configuration', () => {
  const maxTokens = 'inferenceConfiguration: { maxTokens: 0 }';
  const temperature = {
    over: 'inferenceConfiguration: { temperature: 1.1 }',
    under: 'inferenceConfiguration: { temperature: -0.1 }',
  };
  const topP = {
    over: 'inferenceConfiguration: { topP: 1.1 }',
    under: 'inferenceConfiguration: { topP: -0.1 }',
  };

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

  test('temperature over', () => {
    expect(() => transform(generationRoute(temperature.over))).toThrow(
      '@generation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
    );
  });

  test('topP over', () => {
    expect(() => transform(generationRoute(topP.over))).toThrow(
      '@generation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: 1.1',
    );
  });

  test('temperature under', () => {
    expect(() => transform(generationRoute(temperature.under))).toThrow(
      '@generation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: -0.1',
    );
  });

  test('topP under', () => {
    expect(() => transform(generationRoute(topP.under))).toThrow(
      '@generation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: -0.1',
    );
  });
});
// });

describe('inference profile IAM policies', () => {
  const generationSchema = (modelId: string): string => `
    type Query {
      generate(description: String!): String
      @generation(
        aiModel: "${modelId}",
        systemPrompt: "Generate something.",
      )
      @auth(rules: [{ allow: public, provider: iam }])
    }
  `;

  const findBedrockStack = (out: DeploymentResources): Record<string, any> => {
    const stackName = Object.keys(out.stacks).find((key) => key.includes('GenerationBedrockDataSource'));
    expect(stackName).toBeDefined();
    return out.stacks[stackName!];
  };

  const findCustomIamRole = (stack: Record<string, any>): Record<string, any> => {
    const resources = stack.Resources ?? {};
    const roleKey = Object.keys(resources).find((key) => resources[key].Type === 'AWS::IAM::Role' && key.includes('IAMRole'));
    expect(roleKey).toBeDefined();
    return resources[roleKey!];
  };

  const getPolicyStatements = (role: Record<string, any>): any[] => {
    const policies = role.Properties?.Policies ?? [];
    expect(policies.length).toBeGreaterThan(0);
    return policies[0].PolicyDocument.Statement;
  };

  const resourceToString = (resource: any): string => {
    if (typeof resource === 'string') return resource;
    if (resource?.['Fn::Join']) {
      return resource['Fn::Join'][1].map((part: any) => (typeof part === 'string' ? part : '<ref>')).join('');
    }
    return JSON.stringify(resource);
  };

  test('foundation model produces a single IAM policy statement with foundation-model ARN', () => {
    const out = transform(generationSchema('anthropic.claude-3-haiku-20240307-v1:0'));
    const stack = findBedrockStack(out);
    const role = findCustomIamRole(stack);
    const statements = getPolicyStatements(role);

    expect(statements).toHaveLength(1);
    expect(statements[0].Action).toEqual('bedrock:InvokeModel');
    const resourceStr = resourceToString(statements[0].Resource);
    expect(resourceStr).toContain('foundation-model/anthropic.claude-3-haiku-20240307-v1:0');
  });

  test('regional inference profile (us. prefix) produces 2 IAM policy statements', () => {
    const out = transform(generationSchema('us.anthropic.claude-3-haiku-20240307-v1:0'));
    const stack = findBedrockStack(out);
    const role = findCustomIamRole(stack);
    const statements = getPolicyStatements(role);

    expect(statements).toHaveLength(2);

    const resourceStrings = statements.map((s: any) => resourceToString(s.Resource));

    // Statement 1: inference-profile ARN (with account)
    const inferenceProfileArn = resourceStrings.find((r: string) => r.includes('inference-profile/'));
    expect(inferenceProfileArn).toBeDefined();
    expect(inferenceProfileArn).toContain('inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0');

    // Statement 2: foundation-model ARN (stripped model ID)
    const foundationModelArn = resourceStrings.find((r: string) => r.includes('foundation-model/'));
    expect(foundationModelArn).toBeDefined();
    expect(foundationModelArn).toContain('foundation-model/anthropic.claude-3-haiku-20240307-v1:0');
  });

  test('global inference profile produces 3 IAM policy statements', () => {
    const out = transform(generationSchema('global.anthropic.claude-3-haiku-20240307-v1:0'));
    const stack = findBedrockStack(out);
    const role = findCustomIamRole(stack);
    const statements = getPolicyStatements(role);

    expect(statements).toHaveLength(3);

    const resourceStrings = statements.map((s: any) => resourceToString(s.Resource));

    // Statement 1: inference-profile ARN
    const inferenceProfileArn = resourceStrings.find((r: string) => r.includes('inference-profile/'));
    expect(inferenceProfileArn).toBeDefined();
    expect(inferenceProfileArn).toContain('inference-profile/global.anthropic.claude-3-haiku-20240307-v1:0');

    // Statements 2 & 3: foundation-model ARNs
    const foundationModelArns = resourceStrings.filter((r: string) => r.includes('foundation-model/'));
    expect(foundationModelArns).toHaveLength(2);

    // One should have an empty region (global ARN)
    const hasGlobalArn = foundationModelArns.some((r: string) => r.includes(':bedrock:::'));
    expect(hasGlobalArn).toBe(true);

    // Both should reference the stripped foundation model ID
    foundationModelArns.forEach((r: string) => {
      expect(r).toContain('foundation-model/anthropic.claude-3-haiku-20240307-v1:0');
    });
  });
});

const getResolverResource = (queryName: string, resources?: Record<string, any>): Record<string, any> => {
  const resolverName = `Query${queryName}Resolver`;
  return resources?.[resolverName];
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
