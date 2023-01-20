import { ModelTransformer, RdsModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { NamedTypeNode, parse } from 'graphql';
import {
  doNotExpectFields,
  expectFields,
  expectFieldsOnInputType,
  getFieldOnInputType,
  getFieldOnObjectType,
  getInputType,
  getObjectType, verifyInputCount, verifyMatchingTypes,
} from './test-utils/helpers';

const featureFlags = {
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
  getObject: jest.fn(),
};

describe('Shared model transformer plugin tests', () => {
  test.each(['model', 'rdsModel'])(
    'should successfully transform simple valid schema for @%s',
    async (directiveName: string) => {
      const validSchema = `
        type Post @${directiveName} {
            id: ID!
            title: String!
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();

      validateModelSchema(parse(out.schema));
      parse(out.schema);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support custom query overrides for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(queries: { get: "customGetPost", list: "customListPost" }) {
            id: ID!
            title: String!
            createdAt: String
            updatedAt: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const out = transformer.transform(validSchema);
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
      const idField = createPostInput!.fields!.find(f => f.name.value === 'id');
      expect((idField!.type as NamedTypeNode).name!.value).toEqual('ID');
      const queryType = getObjectType(parsed, 'Query');
      expect(queryType).toBeDefined();
      expectFields(queryType!, ['customGetPost']);
      expectFields(queryType!, ['customListPost']);
      const subscriptionType = getObjectType(parsed, 'Subscription');
      expect(subscriptionType).toBeDefined();
      expectFields(subscriptionType!, ['onCreatePost', 'onUpdatePost', 'onDeletePost']);
      const subField = subscriptionType!.fields!.find(f => f.name.value === 'onCreatePost');
      expect(subField).toBeDefined();
      expect(subField!.directives!.length).toEqual(1);
      expect(subField!.directives![0].name!.value).toEqual('aws_subscribe');
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support custom mutations overrides for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(mutations: { create: "customCreatePost", update: "customUpdatePost", delete: "customDeletePost" }) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      const definition = out.schema;
      expect(definition).toBeDefined();
      const parsedDefinition = parse(definition);
      validateModelSchema(parsedDefinition);
      const mutationType = getObjectType(parsedDefinition, 'Mutation');
      expect(mutationType).toBeDefined();
      expectFields(mutationType!, ['customCreatePost', 'customUpdatePost', 'customDeletePost']);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not generate mutations when mutations are set to null for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(mutations: null) {
              id: ID!
              title: String!
              createdAt: String
              updatedAt: String
          }
          `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      const definition = out.schema;
      expect(definition).toBeDefined();
      const parsed = parse(definition);
      validateModelSchema(parsed);
      const mutationType = getObjectType(parsed, 'Mutation');
      expect(mutationType).not.toBeDefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not generate queries when queries are set to null for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(queries: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      const definition = out.schema;
      expect(definition).toBeDefined();
      const parsed = parse(definition);
      validateModelSchema(parsed);
      const mutationType = getObjectType(parsed, 'Mutation');
      expect(mutationType).toBeDefined();
      const queryType = getObjectType(parsed, 'Query');
      expect(queryType).not.toBeDefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not generate subscriptions with subscriptions are set to null for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(subscriptions: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not generate subscriptions, mutations or queries when subscriptions, queries and mutations set to null for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(queries: null, mutations: null, subscriptions: null) {
              id: ID!
              title: String!
              createdAt: String
              updatedAt: String
          }
          `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support mutation input overrides when mutations are disabled for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(mutations: null) {
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
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support mutation input overrides when mutations are enabled for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName} {
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
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'should compile schema successfully when subscription is missing from schema for @%s',
    (directiveName: string) => {
      const validSchema = `
      type Post @${directiveName} {
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
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      const parsed = parse(out.schema);
      validateModelSchema(parsed);

      const subscriptionType = getObjectType(parsed, 'Subscription');
      expect(subscriptionType).toBeDefined();
      expectFields(subscriptionType!, ['onCreatePost', 'onUpdatePost', 'onDeletePost']);
      const mutationType = getObjectType(parsed, 'Mutation');
      expect(mutationType).toBeDefined();
      expectFields(mutationType!, ['createPost', 'updatePost', 'deletePost']);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support non model objects contain id as a type for fields for @%s',
    (directiveName: string) => {
      const validSchema = `
        type Post @${directiveName} {
          id: ID!
          comments: [Comment]
        }
        type Comment {
          id: String!
          text: String!
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'should throw for reserved type name usage',
    (directiveName: string) => {
      const invalidSchema = `
        type Subscription @${directiveName}{
          id: Int
          str: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });
      expect(() => transformer.transform(invalidSchema)).toThrowError(
        "'Subscription' is a reserved type name and currently in use within the default schema element.",
      );
    },
  );

  test.each(['model', 'rdsModel'])(
    'should generate only create mutation for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(mutations: { create: "customCreatePost" }) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      const definition = out.schema;
      expect(definition).toBeDefined();
      const parsed = parse(definition);
      validateModelSchema(parsed);

      const mutationType = getObjectType(parsed, 'Mutation');
      expect(mutationType).toBeDefined();
      expectFields(mutationType!, ['customCreatePost']);
      doNotExpectFields(mutationType!, ['updatePost']);
    },
  );

  test.each(['model', 'rdsModel'])(
    'support schema with multiple model directives for @%s',
    (directiveName: string) => {
      const validSchema = `
        type Post @${directiveName} {
            id: ID!
            title: String!
            createdAt: String
            updatedAt: String
        }
  
        type User @${directiveName} {
            id: ID!
            name: String!
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support enum as a field for @%s',
    (directiveName: string) => {
      const validSchema = `
        enum Status { DELIVERED IN_TRANSIT PENDING UNKNOWN }
        type Test @${directiveName} {
          status: Status!
          lastStatus: Status!
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      const definition = out.schema;
      expect(definition).toBeDefined();
      const parsed = parse(definition);
      validateModelSchema(parsed);

      const createTestInput = getInputType(parsed, 'CreateTestInput');
      expectFieldsOnInputType(createTestInput!, ['status', 'lastStatus']);

      const updateTestInput = getInputType(parsed, 'CreateTestInput');
      expectFieldsOnInputType(updateTestInput!, ['status', 'lastStatus']);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support non-model types and enums for @%s',
    (directiveName: string) => {
      const validSchema = `
        type Post @${directiveName} {
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
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'it should generate filter inputs',
    (directiveName: string) => {
      const validSchema = `
        type Post @${directiveName} {
            id: ID!
            title: String!
            createdAt: String
            updatedAt: String
        }`;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
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
    },
  );

  test.each(['model', 'rdsModel'])(
    'Should support public level subscriptions without defining custom names for @%s',
    (directiveName: string) => {
      const validSchema = `
      type Post @${directiveName}(subscriptions: { level: public }) {
        id: ID!
        title: String!
      }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
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
      expectFields(subscriptionType!, ['onUpdatePost', 'onCreatePost', 'onDeletePost']);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support advanced subscriptions for @%s',
    (directiveName: string) => {
      const validSchema = `type Post @${directiveName}(subscriptions: {
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
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
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
      expectFields(subscriptionType!, ['onUpdatePoster', 'onCreatePoster', 'onDeletePoster', 'onCreatePost']);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not generate superfluous input and filter types for @%s',
    (directiveName: string) => {
      const validSchema = `
      type Entity @${directiveName}(mutations: null, subscriptions: null, queries: {get: "getEntity"}) {
        id: ID!
        str: String
      }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema).toMatchSnapshot();
      const schema = parse(result.schema);
      validateModelSchema(schema);
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support timestamp parameters when generating resolvers and output schema for @%s',
    (directiveName: string) => {
      const validSchema = `
      type Post @${directiveName}(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn"}) {
        id: ID!
        str: String
      }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema).toMatchSnapshot();
      const schema = parse(result.schema);
      validateModelSchema(schema);

      expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
      expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not to auto generate createdAt and updatedAt when the type in schema is not AWSDateTime for @%s',
    (directiveName: string) => {
      const validSchema = `
    type Post @${directiveName} {
      id: ID!
      str: String
      createdAt: AWSTimestamp
      updatedAt: AWSTimestamp
    }
    `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema).toMatchSnapshot();
      const schema = parse(result.schema);
      validateModelSchema(schema);

      expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
      expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should have timestamps as nullable fields when the type makes it non-nullable for @%s',
    (directiveName: string) => {
      const validSchema = `
        type Post @${directiveName} {
          id: ID!
          str: String
          createdAt: AWSDateTime!
          updatedAt: AWSDateTime!
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema).toMatchSnapshot();
      const schema = parse(result.schema);
      validateModelSchema(schema);

      expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
      expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should not to include createdAt and updatedAt field when timestamps is set to null for @%s',
    (directiveName: string) => {
      const validSchema = `
      type Post @${directiveName}(timestamps: null) {
        id: ID!
        str: String
      }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema).toMatchSnapshot();
      const schema = parse(result.schema);
      validateModelSchema(schema);

      expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
      expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should filter known input types from create and update input fields for @%s',
    (directiveName: string) => {
      const validSchema = `
        type Test @${directiveName} {
          id: ID!
          email: Email
        }
  
        type Email @${directiveName} {
          id: ID!
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });

      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema).toMatchSnapshot();
      const schema = parse(result.schema);
      validateModelSchema(schema);

      const createTestInput = getInputType(schema, 'CreateTestInput');
      expect(getFieldOnInputType(createTestInput!, 'email')).toBeUndefined();

      const updateTestInput = getInputType(schema, 'UpdateTestInput');
      expect(getFieldOnInputType(updateTestInput!, 'email')).toBeUndefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should generate enum input objects for @%s',
    (directiveName: string) => {
      const validSchema = /* GraphQL */ `
        type Post @${directiveName} {
          id: ID!
          title: String!
          createdAt: AWSDateTime
          updatedAt: AWSDateTime
          metadata: PostMetadata
          entityMetadata: EntityMetadata
          appearsIn: [Episode!]
          episode: Episode
        }
        type Author @${directiveName} {
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
        type Require @${directiveName} {
          id: ID!
          requiredField: String!
          notRequiredField: String
        }
        type Comment @${directiveName}(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" }) {
          id: ID!
          title: String!
          content: String
          updatedOn: Int # No automatic generation of timestamp if its not AWSDateTime
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const result = transformer.transform(validSchema);
      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      const schema = parse(result.schema);
      validateModelSchema(schema);
      expect(result.schema).toMatchSnapshot();
      expect(verifyInputCount(schema, 'ModelEpisodeInput', 1)).toBeTruthy();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should support support scalar list for @%s',
    (directiveName: string) => {
      const validSchema = /* GraphQL */ `
        type Post @${directiveName} {
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
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
        featureFlags,
      });
      const out = transformer.transform(validSchema);
      expect(out).toBeDefined();
      validateModelSchema(parse(out.schema));
    },
  );
});
