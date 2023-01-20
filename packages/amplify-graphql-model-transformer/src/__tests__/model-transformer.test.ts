import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  ConflictHandlerType,
  GraphQLTransform,
  SyncConfig,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import {
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  NamedTypeNode,
  parse,
} from 'graphql';
import { getBaseType } from 'graphql-transformer-common';
import {
  expectFields,
  expectFieldsOnInputType,
  getFieldOnInputType,
  getInputType,
  getObjectType,
} from './test-utils/helpers';
import { expect as cdkExpect, haveResource } from '@aws-cdk/assert';

const featureFlags = {
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
  getObject: jest.fn(),
};

describe('ModelTransformer: ', () => {
  it('should add default primary key when not defined', () => {
    const validSchema = `
      type Post @model{
        str: String
      }
    `;
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
    });
    const result = transformer.transform(validSchema);
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    const createPostInput: InputObjectTypeDefinitionNode = schema.definitions.find(
      d => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreatePostInput',
    )! as InputObjectTypeDefinitionNode;
    expect(createPostInput).toBeDefined();
    const defaultIdField: InputValueDefinitionNode = createPostInput.fields!.find(f => f.name.value === 'id')!;
    expect(defaultIdField).toBeDefined();
    expect(getBaseType(defaultIdField.type)).toEqual('ID');
  });

  it('should not add default primary key when ID is defined', () => {
    const validSchema = `
      type Post @model{
        id: Int
        str: String
      }
    `;
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
    });
    const result = transformer.transform(validSchema);
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    const createPostInput: InputObjectTypeDefinitionNode = schema.definitions.find(
      d => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreatePostInput',
    )! as InputObjectTypeDefinitionNode;
    expect(createPostInput).toBeDefined();
    const defaultIdField: InputValueDefinitionNode = createPostInput.fields!.find(f => f.name.value === 'id')!;
    expect(defaultIdField).toBeDefined();
    expect(getBaseType(defaultIdField.type)).toEqual('Int');
    // It should not add default value for ctx.arg.id as id is of type Int
    expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
  });

  it('should generate sync resolver with ConflictHandlerType.Automerge', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
      }
    `;

    const config: SyncConfig = {
      ConflictDetection: 'VERSION',
      ConflictHandler: ConflictHandlerType.AUTOMERGE,
    };

    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
      resolverConfig: {
        project: config,
      },
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();
    expect(out.resolvers).toMatchSnapshot();

    validateModelSchema(parse(definition));
  });

  it('should generate sync resolver with ConflictHandlerType.LAMBDA', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
    `;

    const config: SyncConfig = {
      ConflictDetection: 'VERSION',
      ConflictHandler: ConflictHandlerType.LAMBDA,
      LambdaConflictHandler: {
        name: 'myLambdaConflictHandler',
      },
    };

    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
      resolverConfig: {
        project: config,
      },
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();
    expect(out.resolvers).toMatchSnapshot();

    validateModelSchema(parse(definition));
  });

  it('should generate sync resolver with ConflictHandlerType.Optimistic', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
    `;

    const config: SyncConfig = {
      ConflictDetection: 'VERSION',
      ConflictHandler: ConflictHandlerType.OPTIMISTIC,
    };

    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
      resolverConfig: {
        project: config,
      },
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();
    expect(out.resolvers).toMatchSnapshot();

    validateModelSchema(parse(definition));
  });

  it('should generate iam role names under 64 chars and subscriptions under 50', () => {
    const validSchema = `
      type ThisIsAVeryLongNameModelThatShouldNotGenerateIAMRoleNamesOver64Characters @model {
          id: ID!
          title: String!
      }
    `;

    const config: SyncConfig = {
      ConflictDetection: 'VERSION',
      ConflictHandler: ConflictHandlerType.AUTOMERGE,
    };

    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
      resolverConfig: {
        project: config,
      },
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();

    subscriptionType!.fields!.forEach(it => {
      expect(it.name.value.length <= 50).toBeTruthy();
    });

    const iamStackResource = out.stacks.ThisIsAVeryLongNameModelThatShouldNotGenerateIAMRoleNamesOver64Characters;
    expect(iamStackResource).toBeDefined();
    cdkExpect(iamStackResource).to(
      haveResource('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'appsync.amazonaws.com',
              },
            },
          ],
          Version: '2012-10-17',
        },
        RoleName: {
          'Fn::Join': [
            '',
            [
              'ThisIsAVeryLongNameM2d9fca-',
              {
                Ref: 'referencetotransformerrootstackGraphQLAPI20497F53ApiId',
              },
              '-',
              {
                Ref: 'referencetotransformerrootstackenv10C5A902Ref',
              },
            ],
          ],
        },
      }),
    );

    validateModelSchema(parsed);
  });

  it('should generate the ID field when not specified', () => {
    const validSchema = `type Todo @model {
      name: String
    }`;

    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
    });

    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    const createTodoInput = getInputType(parsed, 'CreateTodoInput');
    expect(createTodoInput).toBeDefined();

    expectFieldsOnInputType(createTodoInput!, ['id', 'name']);

    const idField = createTodoInput!.fields!.find(f => f.name.value === 'id');
    expect((idField!.type as NamedTypeNode).name!.value).toEqual('ID');
    expect((idField!.type as NamedTypeNode).kind).toEqual('NamedType');

    const updateTodoInput = getInputType(parsed, 'UpdateTodoInput');
    expect(updateTodoInput).toBeDefined();

    expectFieldsOnInputType(updateTodoInput!, ['name']);
  });
  it('the datastore table should be configured', () => {
    const validSchema = `
    type Todo @model {
      name: String
    }`;

    const transformer = new GraphQLTransform({
      transformConfig: {},
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
      sandboxModeEnabled: true,
      transformers: [new ModelTransformer()],
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    // sync operation
    const queryObject = getObjectType(schema, 'Query');
    expectFields(queryObject!, ['syncTodos']);
    // sync resolvers
    expect(out.resolvers['Query.syncTodos.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.syncTodos.res.vtl']).toMatchSnapshot();
    // ds table
    cdkExpect(out.rootStack).to(
      haveResource('AWS::DynamoDB::Table', {
        KeySchema: [
          {
            AttributeName: 'ds_pk',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'ds_sk',
            KeyType: 'RANGE',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'ds_pk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'ds_sk',
            AttributeType: 'S',
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
        StreamSpecification: {
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
        TableName: {
          'Fn::Join': [
            '',
            [
              'AmplifyDataStore-',
              {
                'Fn::GetAtt': ['GraphQLAPI', 'ApiId'],
              },
              '-',
              {
                Ref: 'env',
              },
            ],
          ],
        },
        TimeToLiveSpecification: {
          AttributeName: '_ttl',
          Enabled: true,
        },
      }),
    );
  });

  it('should add the model parameters at the root sack', () => {
    const modelParams = {
      DynamoDBModelTableReadIOPS: expect.objectContaining({
        Type: 'Number',
        Default: 5,
        Description: 'The number of read IOPS the table should support.',
      }),
      DynamoDBModelTableWriteIOPS: expect.objectContaining({
        Type: 'Number',
        Default: 5,
        Description: 'The number of write IOPS the table should support.',
      }),
      DynamoDBBillingMode: expect.objectContaining({
        Type: 'String',
        Default: 'PAY_PER_REQUEST',
        AllowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
        Description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
      }),
      DynamoDBEnablePointInTimeRecovery: expect.objectContaining({
        Type: 'String',
        Default: 'false',
        AllowedValues: ['true', 'false'],
        Description: 'Whether to enable Point in Time Recovery on the table.',
      }),
      DynamoDBEnableServerSideEncryption: expect.objectContaining({
        Type: 'String',
        Default: 'true',
        AllowedValues: ['true', 'false'],
        Description: 'Enable server side encryption powered by KMS.',
      }),
    };
    const validSchema = `type Todo @model {
      name: String
    }`;
    const transformer = new GraphQLTransform({
      sandboxModeEnabled: true,
      transformers: [new ModelTransformer()],
    });
    const out = transformer.transform(validSchema);

    const rootStack = out.rootStack;
    expect(rootStack).toBeDefined();
    expect(rootStack.Parameters).toMatchObject(modelParams);

    const todoStack = out.stacks['Todo'];
    expect(todoStack).toBeDefined();
    expect(todoStack.Parameters).toMatchObject(modelParams);
  });

  it('global auth enabled should add apiKey if not default mode of auth', () => {
    const validSchema = `
    type Post @model {
      id: ID!
      title: String!
      tags: [Tag]
    }

    type Tag {
      id: ID
      tags: [Tag]
    }`;
    const transformer = new GraphQLTransform({
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'API_KEY',
          },
        ],
      },
      sandboxModeEnabled: true,
      transformers: [new ModelTransformer()],
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const schema = parse(out.schema);
    validateModelSchema(schema);

    const postType = getObjectType(schema, 'Post')!;
    expect(postType).toBeDefined();
    expect(postType.directives).toBeDefined();
    expect(postType.directives!.some(dir => dir.name.value === 'aws_api_key')).toEqual(true);

    const tagType = getObjectType(schema, 'Tag')!;
    expect(tagType).toBeDefined();
    expect(tagType.directives).toBeDefined();
    expect(tagType.directives!.some(dir => dir.name.value === 'aws_api_key')).toEqual(true);

    // check operations
    const queryType = getObjectType(schema, 'Query')!;
    expect(queryType).toBeDefined();
    const mutationType = getObjectType(schema, 'Mutation')!;
    expect(mutationType).toBeDefined();
    const subscriptionType = getObjectType(schema, 'Subscription')!;
    expect(subscriptionType).toBeDefined();

    for (const field of [...queryType.fields!, ...mutationType.fields!, ...subscriptionType.fields!]) {
      expect(field.directives!.some(dir => dir.name.value === 'aws_api_key')).toEqual(true);
    }
  });

  it('maps model resolvers to specified stack', () => {
    const inputSchema = /* GraphQL */ `
      type Blog @model {
        id: ID!
        name: String!
      }
    `;
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      stackMapping: {
        CreateBlogResolver: 'myCustomStack1',
        UpdateBlogResolver: 'myCustomStack2',
      },
    });

    const result = transformer.transform(inputSchema);
    expect(Object.keys(result.stacks.myCustomStack1.Resources!).includes('CreateBlogResolver')).toBe(true);
    expect(Object.keys(result.stacks.myCustomStack2.Resources!).includes('UpdateBlogResolver')).toBe(true);

    expect(Object.keys(result.stacks.Blog.Resources!).includes('CreateBlogResolver')).toBe(false);
    expect(Object.keys(result.stacks.Blog.Resources!).includes('UpdateBlogResolver')).toBe(false);
  });

  it('allow aws_lambda to pass through', () => {
    const validSchema = `
    type Todo @aws_lambda {
      id: ID!
      name: String!
      description: String
    }

    schema {
      query: Query
    }

    type Query {
      todo: Todo @aws_lambda
    }`;
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  it('handles custom subscriptions passed as strings', () => {
    const validSchema = `type Post @model(subscriptions: {
          onCreate: "onFeedCreated",
          onUpdate: "onFeedUpdated",
          onDelete: "onFeedDeleted"
      }) {
        id: ID!
    }
    `;
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();
    expect(subscriptionType!.fields!.length).toEqual(3);
    expectFields(subscriptionType!, ['onFeedCreated', 'onFeedUpdated', 'onFeedDeleted']);
  });

  it('should generate id for the update input object', async () => {
    const validSchema = `
      type Todo @model {
        uid: String!
        username: String
      }
    `;

    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      featureFlags,
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    const updateTodoInput = getInputType(parsed, 'UpdateTodoInput');
    expect(updateTodoInput).toBeDefined();

    expectFieldsOnInputType(updateTodoInput!, ['id']);
    const updateTodoIdField = getFieldOnInputType(updateTodoInput!, 'id');
    expect(updateTodoIdField.type.kind).toBe('NonNullType');
  });
});
