import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  ConflictHandlerType,
  validateModelSchema,
  MYSQL_DB_TYPE,
  POSTGRES_DB_TYPE,
  constructDataSourceStrategies,
  getResourceNamesForStrategy,
} from '@aws-amplify/graphql-transformer-core';
import { InputObjectTypeDefinitionNode, InputValueDefinitionNode, NamedTypeNode, parse } from 'graphql';
import { getBaseType } from 'graphql-transformer-common';
import { Template } from 'aws-cdk-lib/assertions';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { VpcConfig, ModelDataSourceStrategySqlDbType, SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import {
  doNotExpectFields,
  expectFields,
  expectFieldsOnInputType,
  getFieldOnInputType,
  getFieldOnObjectType,
  getInputType,
  getObjectType,
  verifyInputCount,
  verifyMatchingTypes,
} from './test-utils/helpers';

describe('ModelTransformer:', () => {
  const sqlDatasources: ModelDataSourceStrategySqlDbType[] = [MYSQL_DB_TYPE, POSTGRES_DB_TYPE];

  const makeStrategy = (dbType: ModelDataSourceStrategySqlDbType): SQLLambdaModelDataSourceStrategy => ({
    name: `${dbType}Strategy`,
    dbType,
    dbConnectionConfig: {
      databaseNameSsmPath: '/databaseNameSsmPath',
      hostnameSsmPath: '/hostnameSsmPath',
      passwordSsmPath: '/passwordSsmPath',
      portSsmPath: '/portSsmPath',
      usernameSsmPath: '/usernameSsmPath',
    },
  });

  it('should successfully transform simple valid schema', async () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
  });

  // should successfully transform simple Embeddable type (non-model) schema
  it('should successfully transform simple Embeddable type (non-model) schema', async () => {
    const validSchema = `
      type NonModelType {
          id: ID!
          title: String!
      }
      `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
    expect(out.schema).toMatchSnapshot();
  });
  // should successfully transform simple non-capitalized Embeddable type (non-model) name schema
  it('should successfully transform simple non-capitalized Model/Embeddable type (non-model) name schema', async () => {
    const alsoValidSchema = `
      type modelType @model {
          id: ID!
          title: String!
          nonModelTypeValue: nonModelType
      }
      type nonModelType {
          id: ID!
          title: String!
      }
      `;
    const out = testTransform({
      schema: alsoValidSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
    expect(out.schema).toMatchSnapshot();
    expect(out.schema).toContain('input NonModelTypeInput');
  });

  it('id with non string type should require the field on create mutation', async () => {
    const validSchema = `
      type Task @model {
          id: Int!
          title: String!
      }
      `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    const schema = parse(out.schema);
    expect(out.schema).toMatchSnapshot();
    const createTaskInput = getInputType(schema, 'CreateTaskInput');
    expectFieldsOnInputType(createTaskInput!, ['id', 'title']);
    const idField = createTaskInput!.fields!.find((f) => f.name.value === 'id');
    expect(idField).toBeDefined();
    expect(idField?.type.kind).toEqual('NonNullType');
  });

  it('should support custom query overrides', () => {
    const validSchema = `type Post @model(queries: { get: "customGetPost", list: "customListPost" }) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);
    const createPostInput = getInputType(parsed, 'CreatePostInput');
    expect(createPostInput).toBeDefined();

    expectFieldsOnInputType(createPostInput!, ['id', 'title', 'createdAt', 'updatedAt']);

    // This id should always be optional.
    // aka a named type node aka name.value would not be set if it were a non null node
    const idField = createPostInput!.fields!.find((f) => f.name.value === 'id');
    expect((idField!.type as NamedTypeNode).name!.value).toEqual('ID');
    const queryType = getObjectType(parsed, 'Query');
    expect(queryType).toBeDefined();
    expectFields(queryType!, ['customGetPost']);
    expectFields(queryType!, ['customListPost']);
    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();
    expectFields(subscriptionType!, ['onCreatePost', 'onUpdatePost', 'onDeletePost']);
    const subField = subscriptionType!.fields!.find((f) => f.name.value === 'onCreatePost');
    expect(subField).toBeDefined();
    expect(subField!.directives!.length).toEqual(1);
    expect(subField!.directives![0].name!.value).toEqual('aws_subscribe');
  });

  it('should support custom mutations overrides', () => {
    const validSchema = `type Post @model(mutations: { create: "customCreatePost", update: "customUpdatePost", delete: "customDeletePost" }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsedDefinition = parse(definition);
    validateModelSchema(parsedDefinition);
    const mutationType = getObjectType(parsedDefinition, 'Mutation');
    expect(mutationType).toBeDefined();
    expectFields(mutationType!, ['customCreatePost', 'customUpdatePost', 'customDeletePost']);
  });

  it('should not generate mutations when mutations are set to null', () => {
    const validSchema = `type Post @model(mutations: null) {
            id: ID!
            title: String!
            createdAt: String
            updatedAt: String
        }
        `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);
    const mutationType = getObjectType(parsed, 'Mutation');
    expect(mutationType).not.toBeDefined();
  });

  it('should not generate queries when queries are set to null', () => {
    const validSchema = `type Post @model(queries: null) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);
    const mutationType = getObjectType(parsed, 'Mutation');
    expect(mutationType).toBeDefined();
    const queryType = getObjectType(parsed, 'Query');
    expect(queryType).not.toBeDefined();
  });

  it('should not generate subscriptions with subscriptions are set to null', () => {
    const validSchema = `type Post @model(subscriptions: null) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);
    const mutationType = getObjectType(parsed, 'Mutation');
    expect(mutationType).toBeDefined();
    const queryType = getObjectType(parsed, 'Query');
    expect(queryType).toBeDefined();
    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).not.toBeDefined();
  });

  it('should not generate subscriptions, mutations or queries when subscriptions, queries and mutations set to null', () => {
    const validSchema = `type Post @model(queries: null, mutations: null, subscriptions: null) {
            id: ID!
            title: String!
            createdAt: String
            updatedAt: String
        }
        `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);
    const mutationType = getObjectType(parsed, 'Mutation');
    expect(mutationType).not.toBeDefined();
    const queryType = getObjectType(parsed, 'Query');
    expect(queryType).not.toBeDefined();
    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).not.toBeDefined();
  });

  it('should support mutation input overrides when mutations are disabled', () => {
    const validSchema = `type Post @model(mutations: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      input CreatePostInput {
          different: String
      }
      input UpdatePostInput {
          different2: String
      }
      input DeletePostInput {
          different3: String
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);
    const createPostInput = getInputType(parsed, 'CreatePostInput');
    expectFieldsOnInputType(createPostInput!, ['different']);
    const updatePostInput = getInputType(parsed, 'UpdatePostInput');
    expectFieldsOnInputType(updatePostInput!, ['different2']);
    const deletePostInput = getInputType(parsed, 'DeletePostInput');
    expectFieldsOnInputType(deletePostInput!, ['different3']);
  });

  it('should support mutation input overrides when mutations are enabled', () => {
    const validSchema = `type Post @model {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    # User defined types always take precedence.
    input CreatePostInput {
        different: String
    }
    input UpdatePostInput {
        different2: String
    }
    input DeletePostInput {
        different3: String
    }
  `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const createPostInput = getInputType(parsed, 'CreatePostInput');
    expectFieldsOnInputType(createPostInput!, ['different']);
    const updatePostInput = getInputType(parsed, 'UpdatePostInput');
    expectFieldsOnInputType(updatePostInput!, ['different2']);
    const deletePostInput = getInputType(parsed, 'DeletePostInput');
    expectFieldsOnInputType(deletePostInput!, ['different3']);
  });

  it('should add default primary key when not defined', () => {
    const validSchema = `
      type Post @model{
        str: String
      }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    const createPostInput: InputObjectTypeDefinitionNode = schema.definitions.find(
      (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreatePostInput',
    )! as InputObjectTypeDefinitionNode;
    expect(createPostInput).toBeDefined();
    const defaultIdField: InputValueDefinitionNode = createPostInput.fields!.find((f) => f.name.value === 'id')!;
    expect(defaultIdField).toBeDefined();
    expect(getBaseType(defaultIdField.type)).toEqual('ID');
  });

  it('should compile schema successfully when subscription is missing from schema', () => {
    const validSchema = `
    type Post @model {
      id: Int
      str: String
    }

    type Query {
      Custom: String
    }

    schema {
      query: Query
    }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const parsed = parse(out.schema);
    validateModelSchema(parsed);

    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();
    expectFields(subscriptionType!, ['onCreatePost', 'onUpdatePost', 'onDeletePost']);
    const mutationType = getObjectType(parsed, 'Mutation');
    expect(mutationType).toBeDefined();
    expectFields(mutationType!, ['createPost', 'updatePost', 'deletePost']);
  });

  it('should support non model objects contain id as a type for fields', () => {
    const validSchema = `
      type Post @model {
        id: ID!
        comments: [Comment]
      }
      type Comment {
        id: String!
        text: String!
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);
    const commentInput = getInputType(parsed, 'CommentInput');
    expectFieldsOnInputType(commentInput!, ['id', 'text']);
    const commentObject = getObjectType(parsed, 'Comment');
    const commentInputObject = getInputType(parsed, 'CommentInput');
    const commentObjectIDField = getFieldOnObjectType(commentObject!, 'id');
    const commentInputIDField = getFieldOnInputType(commentInputObject!, 'id');
    verifyMatchingTypes(commentObjectIDField.type, commentInputIDField.type);
    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();
  });

  it('should throw for reserved type name usage', () => {
    const invalidSchema = `
      type Subscription @model{
        id: Int
        str: String
      }
    `;
    expect(() =>
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer()],
      }),
    ).toThrowError("'Subscription' is a reserved type name and currently in use within the default schema element.");
  });

  it('should not add default primary key when ID is defined', () => {
    const validSchema = `
      type Post @model{
        id: Int
        str: String
      }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    const createPostInput: InputObjectTypeDefinitionNode = schema.definitions.find(
      (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreatePostInput',
    )! as InputObjectTypeDefinitionNode;
    expect(createPostInput).toBeDefined();
    const defaultIdField: InputValueDefinitionNode = createPostInput.fields!.find((f) => f.name.value === 'id')!;
    expect(defaultIdField).toBeDefined();
    expect(getBaseType(defaultIdField.type)).toEqual('Int');
    // It should not add default value for ctx.arg.id as id is of type Int
    expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
  });

  it('should generate only create mutation', () => {
    const validSchema = `type Post @model(mutations: { create: "customCreatePost" }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        shouldDeepMergeDirectiveConfigDefaults: false,
      },
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const mutationType = getObjectType(parsed, 'Mutation');
    expect(mutationType).toBeDefined();
    expectFields(mutationType!, ['customCreatePost']);
    doNotExpectFields(mutationType!, ['updatePost']);
  });

  it('support schema with multiple model directives', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }

      type User @model {
          id: ID!
          name: String!
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const queryType = getObjectType(parsed, 'Query');
    expect(queryType).toBeDefined();
    expectFields(queryType!, ['listPosts']);
    expectFields(queryType!, ['listUsers']);

    const stringInputType = getInputType(parsed, 'ModelStringInput');
    expect(stringInputType).toBeDefined();
    const booleanInputType = getInputType(parsed, 'ModelBooleanInput');
    expect(booleanInputType).toBeDefined();
    const intInputType = getInputType(parsed, 'ModelIntInput');
    expect(intInputType).toBeDefined();
    const floatInputType = getInputType(parsed, 'ModelFloatInput');
    expect(floatInputType).toBeDefined();
    const idInputType = getInputType(parsed, 'ModelIDInput');
    expect(idInputType).toBeDefined();
    const postInputType = getInputType(parsed, 'ModelPostFilterInput');
    expect(postInputType).toBeDefined();
    const userInputType = getInputType(parsed, 'ModelUserFilterInput');
    expect(userInputType).toBeDefined();

    expect(verifyInputCount(parsed, 'ModelStringInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelBooleanInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelIntInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelFloatInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelIDInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelPostFilterInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelUserFilterInput', 1)).toBeTruthy();
  });

  it('should support enum as a field', () => {
    const validSchema = `
      enum Status { DELIVERED IN_TRANSIT PENDING UNKNOWN }
      type Test @model {
        status: Status!
        lastStatus: Status!
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const createTestInput = getInputType(parsed, 'CreateTestInput');
    expectFieldsOnInputType(createTestInput!, ['status', 'lastStatus']);

    const updateTestInput = getInputType(parsed, 'CreateTestInput');
    expectFieldsOnInputType(updateTestInput!, ['status', 'lastStatus']);
  });

  it('should support non-model types and enums', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
          metadata: [PostMetadata!]!
          appearsIn: [Episode]!
      }
      type PostMetadata {
          tags: Tag
      }
      type Tag {
          published: Boolean
          metadata: PostMetadata
      }
      enum Episode {
          NEWHOPE
          EMPIRE
          JEDI
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const postMetaDataInputType = getInputType(parsed, 'PostMetadataInput');
    expect(postMetaDataInputType).toBeDefined();
    const tagInputType = getInputType(parsed, 'TagInput');
    expect(tagInputType).toBeDefined();
    expectFieldsOnInputType(tagInputType!, ['metadata']);
    const createPostInputType = getInputType(parsed, 'CreatePostInput');
    expectFieldsOnInputType(createPostInputType!, ['metadata', 'appearsIn']);
    const updatePostInputType = getInputType(parsed, 'UpdatePostInput');
    expectFieldsOnInputType(updatePostInputType!, ['metadata', 'appearsIn']);

    const postModelObject = getObjectType(parsed, 'Post');
    const postMetaDataInputField = getFieldOnInputType(createPostInputType!, 'metadata');
    const postMetaDataField = getFieldOnObjectType(postModelObject!, 'metadata');
    // this checks that the non-model type was properly "unwrapped", renamed, and "rewrapped"
    // in the generated CreatePostInput type - its types should be the same as in the Post @model type
    verifyMatchingTypes(postMetaDataInputField.type, postMetaDataField.type);

    expect(verifyInputCount(parsed, 'PostMetadataInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'TagInput', 1)).toBeTruthy();
  });

  it('should generate filter inputs', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const queryType = getObjectType(parsed, 'Query');
    expect(queryType).toBeDefined();
    expectFields(queryType!, ['listPosts']);

    const connectionType = getObjectType(parsed, 'ModelPostConnection');
    expect(connectionType).toBeDefined();

    expect(verifyInputCount(parsed, 'ModelStringInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelBooleanInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelIntInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelFloatInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelIDInput', 1)).toBeTruthy();
    expect(verifyInputCount(parsed, 'ModelPostFilterInput', 1)).toBeTruthy();
  });

  it('Should support public level subscriptions without defining custom names', () => {
    const validSchema = `
    type Post @model(subscriptions: { level: public }) {
      id: ID!
      title: String!
    }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();
    expectFields(subscriptionType!, ['onUpdatePost', 'onCreatePost', 'onDeletePost']);
  });

  it('should support advanced subscriptions', () => {
    const validSchema = `type Post @model(subscriptions: {
          onCreate: ["onCreatePoster", "onCreatePost"],
          onUpdate: ["onUpdatePoster"],
          onDelete: ["onDeletePoster"]
      }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();
    const parsed = parse(definition);
    validateModelSchema(parsed);

    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();
    expectFields(subscriptionType!, ['onUpdatePoster', 'onCreatePoster', 'onDeletePoster', 'onCreatePost']);
  });

  it('should not generate superfluous input and filter types', () => {
    const validSchema = `
    type Entity @model(mutations: null, subscriptions: null, queries: {get: "getEntity"}) {
      id: ID!
      str: String
    }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        shouldDeepMergeDirectiveConfigDefaults: false,
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema).toMatchSnapshot();
    const schema = parse(result.schema);
    validateModelSchema(schema);
  });

  it('should support timestamp parameters when generating resolvers and output schema', () => {
    const validSchema = `
    type Post @model(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn"}) {
      id: ID!
      str: String
    }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema).toMatchSnapshot();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
    expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
  });

  it('should not to auto generate createdAt and updatedAt when the type in schema is not AWSDateTime', () => {
    const validSchema = `
  type Post @model {
    id: ID!
    str: String
    createdAt: AWSTimestamp
    updatedAt: AWSTimestamp
  }
  `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema).toMatchSnapshot();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
    expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
  });

  it('should have timestamps as nullable fields when the type makes it non-nullable', () => {
    const validSchema = `
      type Post @model {
        id: ID!
        str: String
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
      }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema).toMatchSnapshot();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
    expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
  });

  it('should not to include createdAt and updatedAt field when timestamps is set to null', () => {
    const validSchema = `
    type Post @model(timestamps: null) {
      id: ID!
      str: String
    }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema).toMatchSnapshot();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
    expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
  });

  it('should filter known input types from create and update input fields', () => {
    const validSchema = `
      type Test @model {
        id: ID!
        email: Email
      }

      type Email @model {
        id: ID!
      }
    `;
    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema).toMatchSnapshot();
    const schema = parse(result.schema);
    validateModelSchema(schema);

    const createTestInput = getInputType(schema, 'CreateTestInput');
    expect(getFieldOnInputType(createTestInput!, 'email')).toBeUndefined();

    const updateTestInput = getInputType(schema, 'UpdateTestInput');
    expect(getFieldOnInputType(updateTestInput!, 'email')).toBeUndefined();
  });

  it('should generate enum input objects', () => {
    const validSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String!
        createdAt: AWSDateTime
        updatedAt: AWSDateTime
        metadata: PostMetadata
        entityMetadata: EntityMetadata
        appearsIn: [Episode!]
        episode: Episode
      }
      type Author @model {
        id: ID!
        name: String!
        postMetadata: PostMetadata
        entityMetadata: EntityMetadata
      }
      type EntityMetadata {
        isActive: Boolean
      }
      type PostMetadata {
        tags: Tag
      }
      type Tag {
        published: Boolean
        metadata: PostMetadata
      }
      enum Episode {
        NEWHOPE
        EMPIRE
        JEDI
      }
      type Require @model {
        id: ID!
        requiredField: String!
        notRequiredField: String
      }
      type Comment @model(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" }) {
        id: ID!
        title: String!
        content: String
        updatedOn: Int # No automatic generation of timestamp if its not AWSDateTime
      }
    `;

    const result = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    const schema = parse(result.schema);
    validateModelSchema(schema);
    expect(result.schema).toMatchSnapshot();
    expect(verifyInputCount(schema, 'ModelEpisodeInput', 1)).toBeTruthy();
  });

  it('should support support scalar list', () => {
    const validSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        author: String!
        title: String
        content: String
        url: String
        ups: Int
        downs: Int
        version: Int
        postedAt: String
        createdAt: AWSDateTime
        comments: [String!]
        ratings: [Int!]
        percentageUp: Float
        isPublished: Boolean
        jsonField: AWSJSON
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();
    validateModelSchema(parse(out.schema));
  });

  it('should generate sync resolver with ConflictHandlerType.Automerge', () => {
    const validSchema = `
      type Post @model {
          id: ID!
          title: String!
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
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

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.LAMBDA,
          LambdaConflictHandler: {
            name: 'myLambdaConflictHandler',
          },
        },
      },
    });
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.OPTIMISTIC,
        },
      },
    });
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

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    const subscriptionType = getObjectType(parsed, 'Subscription');
    expect(subscriptionType).toBeDefined();

    subscriptionType!.fields!.forEach((it) => {
      expect(it.name.value.length <= 50).toBeTruthy();
    });

    const iamStackResource = out.stacks.ThisIsAVeryLongNameModelThatShouldNotGenerateIAMRoleNamesOver64Characters;
    expect(iamStackResource).toBeDefined();
    Template.fromJSON(iamStackResource).hasResourceProperties('AWS::IAM::Role', {
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
    });

    validateModelSchema(parsed);
  });

  it('should generate the ID field when not specified', () => {
    const validSchema = `type Todo @model {
      name: String
    }`;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
    expect(out).toBeDefined();

    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    const createTodoInput = getInputType(parsed, 'CreateTodoInput');
    expect(createTodoInput).toBeDefined();

    expectFieldsOnInputType(createTodoInput!, ['id', 'name']);

    const idField = createTodoInput!.fields!.find((f) => f.name.value === 'id');
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

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
    });
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
    Template.fromJSON(out.rootStack).hasResourceProperties('AWS::DynamoDB::Table', {
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
    });
  });
  it('the conflict detection of per model rule should be respected', () => {
    const validSchema = `
      type Todo @model {
        name: String
      }
      type Author @model {
        name: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
        models: {
          Todo: {
            ConflictDetection: 'VERSION',
            ConflictHandler: ConflictHandlerType.LAMBDA,
            LambdaConflictHandler: {
              name: 'myTodoConflictHandler',
            },
          },
          Author: {
            ConflictDetection: 'VERSION',
            ConflictHandler: ConflictHandlerType.AUTOMERGE,
          },
        },
      },
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    // nested stacks for models
    const todoStack = out.stacks['Todo'];
    const authorStack = out.stacks['Author'];
    // Todo stack should have lambda for conflict detect rather than auto merge
    Template.fromJSON(todoStack).hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      SyncConfig: {
        ConflictDetection: 'VERSION',
        ConflictHandler: 'LAMBDA',
      },
    });
    Template.fromJSON(todoStack).resourcePropertiesCountIs(
      'AWS::AppSync::FunctionConfiguration',
      {
        SyncConfig: {
          ConflictDetection: 'VERSION',
          ConflictHandler: 'AUTOMERGE',
        },
      },
      0,
    );
    // Author stack should have automerge for conflict detect rather than lambda
    Template.fromJSON(authorStack).resourcePropertiesCountIs(
      'AWS::AppSync::FunctionConfiguration',
      {
        SyncConfig: {
          ConflictDetection: 'VERSION',
          ConflictHandler: 'LAMBDA',
        },
      },
      0,
    );
    Template.fromJSON(authorStack).hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      SyncConfig: {
        ConflictDetection: 'VERSION',
        ConflictHandler: 'AUTOMERGE',
      },
    });
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
    });

    const rootStack = out.rootStack;
    expect(rootStack).toBeDefined();
    expect(rootStack.Parameters).toMatchObject(modelParams);

    const todoStack = out.stacks['Todo'];
    expect(todoStack).toBeDefined();
    expect(todoStack.Parameters).toMatchObject(modelParams);
  });

  it('sandbox auth enabled should add apiKey if not default mode of auth', () => {
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
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
    });
    expect(out).toBeDefined();

    const schema = parse(out.schema);
    validateModelSchema(schema);

    const postType = getObjectType(schema, 'Post')!;
    expect(postType).toBeDefined();
    expect(postType.directives).toBeDefined();
    expect(postType.directives!.length).toEqual(1);
    expect(postType.directives!.some((dir) => dir.name.value === 'aws_api_key')).toEqual(true);

    const tagType = getObjectType(schema, 'Tag')!;
    expect(tagType).toBeDefined();
    expect(tagType.directives).toBeDefined();
    expect(tagType.directives!.length).toEqual(1);
    expect(tagType.directives!.some((dir) => dir.name.value === 'aws_api_key')).toEqual(true);

    // check operations
    const queryType = getObjectType(schema, 'Query')!;
    expect(queryType).toBeDefined();
    const mutationType = getObjectType(schema, 'Mutation')!;
    expect(mutationType).toBeDefined();
    const subscriptionType = getObjectType(schema, 'Subscription')!;
    expect(subscriptionType).toBeDefined();

    for (const field of [...queryType.fields!, ...mutationType.fields!, ...subscriptionType.fields!]) {
      expect(field.directives!.some((dir) => dir.name.value === 'aws_api_key')).toEqual(true);
    }
  });

  it('iam auth enabled should add aws_iam if not default mode of auth', () => {
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: false,
      },
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
    });
    expect(out).toBeDefined();

    const schema = parse(out.schema);
    validateModelSchema(schema);

    const postType = getObjectType(schema, 'Post')!;
    expect(postType).toBeDefined();
    expect(postType.directives).toBeDefined();
    expect(postType.directives!.length).toEqual(1);
    expect(postType.directives!.some((dir) => dir.name.value === 'aws_iam')).toEqual(true);

    const tagType = getObjectType(schema, 'Tag')!;
    expect(tagType).toBeDefined();
    expect(tagType.directives).toBeDefined();
    expect(tagType.directives!.length).toEqual(1);
    expect(tagType.directives!.some((dir) => dir.name.value === 'aws_iam')).toEqual(true);

    // check operations
    const queryType = getObjectType(schema, 'Query')!;
    expect(queryType).toBeDefined();
    const mutationType = getObjectType(schema, 'Mutation')!;
    expect(mutationType).toBeDefined();
    const subscriptionType = getObjectType(schema, 'Subscription')!;
    expect(subscriptionType).toBeDefined();

    for (const field of [...queryType.fields!, ...mutationType.fields!, ...subscriptionType.fields!]) {
      expect(field.directives!.some((dir) => dir.name.value === 'aws_iam')).toEqual(true);
    }
  });

  it('iam and sandbox auth enabled should add aws_iam and aws_api_key if not default mode of auth', () => {
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
          {
            authenticationType: 'API_KEY',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
    });
    expect(out).toBeDefined();

    const schema = parse(out.schema);
    validateModelSchema(schema);

    const postType = getObjectType(schema, 'Post')!;
    expect(postType).toBeDefined();
    expect(postType.directives).toBeDefined();
    expect(postType.directives!.length).toEqual(2);
    expect(postType.directives!.some((dir) => dir.name.value === 'aws_iam')).toEqual(true);
    expect(postType.directives!.some((dir) => dir.name.value === 'aws_api_key')).toEqual(true);

    const tagType = getObjectType(schema, 'Tag')!;
    expect(tagType).toBeDefined();
    expect(tagType.directives).toBeDefined();
    expect(tagType.directives!.length).toEqual(2);
    expect(tagType.directives!.some((dir) => dir.name.value === 'aws_iam')).toEqual(true);
    expect(tagType.directives!.some((dir) => dir.name.value === 'aws_api_key')).toEqual(true);

    // check operations
    const queryType = getObjectType(schema, 'Query')!;
    expect(queryType).toBeDefined();
    const mutationType = getObjectType(schema, 'Mutation')!;
    expect(mutationType).toBeDefined();
    const subscriptionType = getObjectType(schema, 'Subscription')!;
    expect(subscriptionType).toBeDefined();

    for (const field of [...queryType.fields!, ...mutationType.fields!, ...subscriptionType.fields!]) {
      expect(field.directives!.some((dir) => dir.name.value === 'aws_iam')).toEqual(true);
      expect(field.directives!.some((dir) => dir.name.value === 'aws_api_key')).toEqual(true);
    }
  });

  it('maps model resolvers to specified stack', () => {
    const inputSchema = /* GraphQL */ `
      type Blog @model {
        id: ID!
        name: String!
      }
    `;
    const result = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer()],
      stackMapping: {
        CreateBlogResolver: 'myCustomStack1',
        UpdateBlogResolver: 'myCustomStack2',
      },
    });
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
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
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
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

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
    });
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

  sqlDatasources.forEach((dbType) => {
    it('should successfully transform simple rds valid schema', async () => {
      const validSchema = `
        type Post @model {
          id: ID! @primaryKey
          title: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(validSchema, makeStrategy(dbType)),
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      parse(out.schema);
    });

    it('should successfully transform rds schema with array and object fields', async () => {
      const validSchema = `
        type Note @model {
            id: ID! @primaryKey
            content: String!
            tags: [String!]
            attachments: Attachment
        }
  
        type Attachment {
          report: String!
          image: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(validSchema, makeStrategy(dbType)),
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      parse(out.schema);
      expect(out.schema).toMatchSnapshot();
      expect(out.resolvers).toMatchSnapshot();
    });

    it('sql lambda with vpc config should generate correct stack', async () => {
      const validSchema = `
        type Note @model {
            id: ID! @primaryKey
            content: String!
        }
      `;

      const vpcConfiguration: VpcConfig = {
        vpcId: 'vpc-123',
        securityGroupIds: ['sg-123'],
        subnetAvailabilityZoneConfig: [
          {
            subnetId: 'sub-123',
            availabilityZone: 'az-123',
          },
          {
            subnetId: 'sub-456',
            availabilityZone: 'az-456',
          },
        ],
      };
      const vpcStrategy: SQLLambdaModelDataSourceStrategy = {
        ...makeStrategy(dbType),
        vpcConfiguration,
      };
      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(validSchema, vpcStrategy),
      });
      expect(out).toBeDefined();

      const resourceNames = getResourceNamesForStrategy(vpcStrategy);

      validateModelSchema(parse(out.schema));
      expect(out.stacks).toBeDefined();
      expect(out.stacks[resourceNames.sqlStack]).toBeDefined();
      expect(out.stacks[resourceNames.sqlStack].Resources).toBeDefined();
      const resourcesIds = Object.keys(out.stacks[resourceNames.sqlStack].Resources!) as string[];
      const sqlLambda =
        out.stacks[resourceNames.sqlStack].Resources![
          resourcesIds.find((resource) => resource.startsWith(resourceNames.sqlLambdaFunction))!
        ];
      expect(sqlLambda).toBeDefined();
      expect(sqlLambda.Properties).toBeDefined();
      expect(sqlLambda.Properties?.VpcConfig).toBeDefined();
      expect(sqlLambda.Properties?.VpcConfig?.SubnetIds).toBeDefined();
      expect(sqlLambda.Properties?.VpcConfig?.SubnetIds).toEqual(expect.arrayContaining(['sub-123', 'sub-456']));
      expect(sqlLambda.Properties?.VpcConfig?.SecurityGroupIds).toBeDefined();
      expect(sqlLambda.Properties?.VpcConfig?.SecurityGroupIds).toEqual(expect.arrayContaining(['sg-123']));
    });

    it('should fail if SQL model has no primary key defined', async () => {
      const invalidSchema = `
        type Note @model {
            id: ID!
            content: String!
        }
      `;

      expect(() =>
        testTransform({
          schema: invalidSchema,
          transformers: [new ModelTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(invalidSchema, makeStrategy(dbType)),
        }),
      ).toThrowError('SQL model "Note" must contain a primary key field');
    });

    it('should compute and render the array fields correctly in the resolver', () => {
      const validSchema = `
        type Post @model {
          id: ID! @primaryKey
          info: Info
          tags: [String!]
        }
        type Info {
          name: String
        }
      `;
      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(validSchema, makeStrategy(dbType)),
      });
      const expectedSnippets = [
        '#set( $lambdaInput.args.metadata.nonScalarFields = ["info", "tags"] )',
        '#set( $lambdaInput.args.metadata.arrayFields = ["tags"] )',
      ];
      expect(out).toBeDefined();
      expectedSnippets.forEach((snippet) => {
        expect(out.resolvers['Mutation.createPost.req.vtl']).toContain(snippet);
        expect(out.resolvers['Mutation.updatePost.req.vtl']).toContain(snippet);
        expect(out.resolvers['Mutation.deletePost.req.vtl']).toContain(snippet);
        expect(out.resolvers['Query.getPost.req.vtl']).toContain(snippet);
        expect(out.resolvers['Query.listPosts.req.vtl']).toContain(snippet);
      });
    });
  });

  describe('remove null timestamp fields from input', () => {
    it('updatedAt null', () => {
      const validSchema = `
        type UpdatedAtNull @model(timestamps: { updatedAt: null }) {
            id: ID!
            title: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer()],
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      expect(out.schema).toMatchSnapshot();
    });

    it('createdAt null', () => {
      const validSchema = `
        type CreatedAtNull @model(timestamps: { createdAt: null }) {
            id: ID!
            title: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer()],
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      expect(out.schema).toMatchSnapshot();
    });

    it('createdAt null and updatedAt null', () => {
      const validSchema = `
        type CreatedAtAndUpdatedAtNull @model(timestamps: { createdAt: null, updatedAt: null }) {
            id: ID!
            title: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer()],
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      expect(out.schema).toMatchSnapshot();
    });

    it('timestamps null', () => {
      const validSchema = `
        type TimeStampsNull @model(timestamps: null) {
            id: ID!
            title: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer()],
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      expect(out.schema).toMatchSnapshot();
    });

    it('custom createdAt and updatedAt null', () => {
      const validSchema = `
        type CustomCreatedAtAndUpdatedAtNull @model(timestamps: { createdAt: "createdOn", updatedAt: null }) {
            id: ID!
            title: String!
        }
      `;

      const out = testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer()],
      });
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      expect(out.schema).toMatchSnapshot();
    });
  });

  describe('autoId', () => {
    describe('dynamodb', () => {
      it('should include autoId for basic ID', async () => {
        const schema = `
          type Post @model {
              id: ID!
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId for implicit ID', async () => {
        const schema = `
          type Post @model {
            title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId for id with @primaryKey', async () => {
        const schema = `
          type Post @model {
            id: ID! @primaryKey
            title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId when timestamps are null with explicit id', async () => {
        const schema = `
          type Post @model(timestamps: null) {
              id: ID!
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId when timestamps are null with implicit id', async () => {
        const schema = `
          type Post @model(timestamps: null) {
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId when id is type String', async () => {
        const schema = `
          type Post @model {
              id: String
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should not include autoId when id is type Int, Float, or Boolean', async () => {
        const schema = `
          type Foo @model {
              id: Int
              title: String!
          }

          type Bar @model {
              id: Float
              title: String!
          }

          type Baz @model {
              id: Boolean
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer()],
        });
        expect(out.resolvers['Mutation.createFoo.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
        expect(out.resolvers['Mutation.createBar.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
        expect(out.resolvers['Mutation.createBaz.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should not include autoId when using a custom primary key', async () => {
        const schema = `
          type Post @model {
              postId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId when using a custom primary key and an explict id', async () => {
        const schema = `
          type Post @model {
              id: ID!
              postId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });
    });

    describe('sql', () => {
      it('should include autoId for basic ID', async () => {
        const schema = `
          type Post @model {
              id: ID!
              postId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(schema, makeStrategy(MYSQL_DB_TYPE)),
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should not include autoId when id field is not included', async () => {
        const schema = `
          type Post @model {
              postId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(schema, makeStrategy(MYSQL_DB_TYPE)),
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId for id with @primaryKey', async () => {
        const schema = `
          type Post @model {
            id: ID! @primaryKey
            title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId when timestamps are null', async () => {
        const schema = `
          type Post @model(timestamps: null) {
              id: ID!
              postId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(schema, makeStrategy(MYSQL_DB_TYPE)),
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should include autoId when id is type String', async () => {
        const schema = `
          type Post @model {
              id: String
              postId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(schema, makeStrategy(MYSQL_DB_TYPE)),
        });
        expect(out.resolvers['Mutation.createPost.init.1.req.vtl']).toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });

      it('should not include autoId when id is type Int, Float, or Boolean', async () => {
        const schema = `
          type Foo @model {
              id: Int
              fooId: ID! @primaryKey
              title: String!
          }

          type Bar @model {
              id: Float
              barId: ID! @primaryKey
              title: String!
          }

          type Baz @model {
              id: Boolean
              bazId: ID! @primaryKey
              title: String!
          }
        `;

        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(schema, makeStrategy(MYSQL_DB_TYPE)),
        });
        expect(out.resolvers['Mutation.createFoo.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
        expect(out.resolvers['Mutation.createBar.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
        expect(out.resolvers['Mutation.createBaz.init.1.req.vtl']).not.toContain(
          '$util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))',
        );
      });
    });
  });
});
