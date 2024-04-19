import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  ConflictHandlerType,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  GraphQLTransform,
  constructDataSourceStrategies,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { Kind, parse } from 'graphql';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '..';
import { hasGeneratedField } from './test-helpers';

test('fails if used as a has one relation', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasMany
    }

    type Test1 @model {
      id: ID! @primaryKey
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('@hasMany must be used with a list. Use @hasOne for non-list types.');
});

test('fails if the provided indexName does not exist.', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: [Test1] @hasMany(indexName: "notDefault")
    }

    type Test1 @model {
      id: ID!
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('Index notDefault does not exist for model Test1');
});

test('fails if a partial sort key is provided', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(indexName: "testIndex", fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @index(name: "testIndex", sortKeyFields: ["friendID", "name"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('Invalid @hasMany directive on testObj. Partial sort keys are not accepted.');
});

test('accepts @hasMany without a sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(indexName: "testIndex", fields: ["id"])
    }

    type Test1 @model {
      id: ID! @index(name: "testIndex", sortKeyFields: ["friendID", "name"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new HasManyTransformer()],
    }),
  ).not.toThrowError();
});

test('fails if provided sort key type does not match custom index sort key type', () => {
  const inputSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: [Test1] @hasMany(indexName: "testIndex", fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @index(name: "testIndex", sortKeyFields: ["friendID"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('email field is not of type ID');
});

test('fails if partition key type passed in does not match custom index partition key type', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(indexName: "testIndex", fields: ["email", "id"])
    }

    type Test1 @model {
      id: ID! @index(name: "testIndex", sortKeyFields: ["friendID"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('email field is not of type ID');
});

test('fails if @hasMany was used on an object that is not a model type', () => {
  const inputSchema = `
    type Test {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('@hasMany must be on an @model object type field.');
});

test('fails if @hasMany was used with a related type that is not a model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(fields: "email")
    }

    type Test1 {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer()],
      dataSourceStrategies: {
        Test: DDB_DEFAULT_DATASOURCE_STRATEGY,
        Test1: DDB_DEFAULT_DATASOURCE_STRATEGY,
      },
    }),
  ).toThrowError('Object type Test1 must be annotated with @model.');
});

test('fails if the related type does not exist', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test2 @hasMany(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('Unknown type "Test2". Did you mean "Test" or "Test1"?');
});

test('fails if an empty list of fields is passed in', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: [Test1] @hasMany(fields: [])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('No fields passed to @hasMany directive.');
});

test('fails if any of the fields passed in are not in the parent model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: [Test1] @hasMany(fields: ["id", "name"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["name"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('name is not a field in Test');
});

test('has many query case', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      otherParts: [Test1] @hasMany(fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email"])
      friendID: ID!
      email: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test') as any;
  expect(testObjType).toBeDefined();

  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'otherParts');
  expect(relatedField).toBeDefined();
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect(relatedField.arguments.length).toEqual(4);
  expect(relatedField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();
  expect((relatedField.type as any).name.value).toEqual('ModelTest1Connection');
});

test('bidirectional has many query case', () => {
  const inputSchema = `
    type Post @model {
      id: ID!
      title: String!
      author: User @belongsTo(fields: ["owner"])
      owner: ID! @index(name: "byOwner", sortKeyFields: ["id"])
    }

    type User @model {
      id: ID!
      posts: [Post] @hasMany(indexName: "byOwner", fields: ["id"])
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer(), new BelongsToTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  // eslint-disable-next-line spellcheck/spell-checker
  expect((out.stacks as any).ConnectionStack.Resources.PostauthorResolver).toBeTruthy();
  // eslint-disable-next-line spellcheck/spell-checker
  expect((out.stacks as any).ConnectionStack.Resources.UserpostsResolver).toBeTruthy();

  const userType = schema.definitions.find((def: any) => def.name && def.name.value === 'User') as any;
  expect(userType).toBeDefined();

  const postsField = userType.fields.find((f: any) => f.name.value === 'posts');
  expect(postsField).toBeDefined();
  expect(postsField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect(postsField.arguments.length).toEqual(5);
  expect(postsField.arguments.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(postsField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(postsField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(postsField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(postsField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();
  expect((postsField.type as any).name.value).toEqual('ModelPostConnection');

  const postType = schema.definitions.find((def: any) => def.name && def.name.value === 'Post') as any;
  expect(postType).toBeDefined();

  const userField = postType.fields.find((f: any) => f.name.value === 'author');
  expect(userField).toBeDefined();
  expect(userField.type.kind).toEqual(Kind.NAMED_TYPE);
});

test('has many query with a composite sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      name: String!
      otherParts: [Test1] @hasMany(fields: ["id", "email", "name"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email", "name"])
      friendID: ID!
      email: String!
      name: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect((out.stacks as any).ConnectionStack.Resources.TestotherPartsResolver).toBeTruthy();

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test') as any;
  expect(testObjType).toBeDefined();

  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'otherParts');
  expect(relatedField).toBeDefined();
  expect((relatedField.type as any).name.value).toEqual('ModelTest1Connection');
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect(relatedField.arguments.length).toEqual(4);
  expect(relatedField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();
});

test('has many query with a composite sort key passed in as an argument', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      name: String!
      otherParts: [Test1] @hasMany(fields: ["id"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email", "name"])
      friendID: ID!
      email: String!
      name: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test') as any;
  expect(testObjType).toBeDefined();

  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'otherParts');
  expect(relatedField).toBeDefined();
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect((relatedField.type as any).name.value).toEqual('ModelTest1Connection');
  expect(relatedField.arguments.length).toEqual(5);
  expect(relatedField.arguments.find((f: any) => f.name.value === 'emailName')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();
});

test('many to many query', () => {
  const inputSchema = `
    type Post @model {
      id: ID!
      title: String!
      editors: [PostEditor] @hasMany(indexName: "byPost", fields: ["id"])
    }

    type PostEditor @model(queries: null) {
      id: ID!
      postID: ID! @index(name: "byPost", sortKeyFields: ["editorID"])
      editorID: ID! @index(name: "byEditor", sortKeyFields: ["postID"])
      post: Post! @belongsTo(fields: ["postID"])
      editor: User! @belongsTo(fields: ["editorID"])
    }

    type User @model {
      id: ID!
      username: String!
      posts: [PostEditor] @hasMany(indexName: "byEditor", fields: ["id"])
    }`;

  const out = testTransform({
    schema: inputSchema,
    resolverConfig: {
      project: {
        ConflictDetection: 'VERSION',
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
      },
    },
    transformers: [
      new ModelTransformer(),
      new IndexTransformer(),
      new HasOneTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
    ],
    transformParameters: {
      enableAutoIndexQueryNames: false,
      respectPrimaryKeyAttributesOnConnectionField: false,
      secondaryKeyAsGSI: false,
    },
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(schema).toMatchSnapshot();
});

test('has many with implicit index and fields', () => {
  const inputSchema = `
    type Post @model {
      id: ID!
      title: String!
      comments: [Comment] @hasMany
    }
    type Comment @model {
      id: ID!
      content: String
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const postType = schema.definitions.find((def: any) => def.name && def.name.value === 'Post') as any;
  expect(postType).toBeDefined();

  const commentField = postType.fields.find((f: any) => f.name.value === 'comments');
  expect(commentField).toBeDefined();
  expect(commentField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect((commentField.type as any).name.value).toEqual('ModelCommentConnection');
  expect(commentField.arguments.length).toEqual(4);
  expect(commentField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(commentField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(commentField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(commentField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();

  const commentCreateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateCommentInput') as any;
  expect(commentCreateInput).toBeDefined();
  expect(commentCreateInput.fields.length).toEqual(3);
  expect(commentCreateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(commentCreateInput.fields.find((f: any) => f.name.value === 'content')).toBeDefined();
  expect(commentCreateInput.fields.find((f: any) => f.name.value === 'postCommentsId')).toBeDefined();

  const commentUpdateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateCommentInput') as any;
  expect(commentUpdateInput).toBeDefined();
  expect(commentUpdateInput.fields.length).toEqual(3);
  expect(commentUpdateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(commentUpdateInput.fields.find((f: any) => f.name.value === 'content')).toBeDefined();
  expect(commentUpdateInput.fields.find((f: any) => f.name.value === 'postCommentsId')).toBeDefined();
});

test('has many with implicit index and fields and a user-defined primary key', () => {
  const inputSchema = `
    type Post @model {
      id: ID!
      title: String! @primaryKey
      comments: [Comment] @hasMany
    }
    type Comment @model {
      id: ID!
      content: String
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
    transformParameters: { respectPrimaryKeyAttributesOnConnectionField: false },
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const postType = schema.definitions.find((def: any) => def.name && def.name.value === 'Post') as any;
  expect(postType).toBeDefined();

  const commentField = postType.fields.find((f: any) => f.name.value === 'comments');
  expect(commentField).toBeDefined();
  expect(commentField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect((commentField.type as any).name.value).toEqual('ModelCommentConnection');
  expect(commentField.arguments.length).toEqual(4);
  expect(commentField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(commentField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(commentField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(commentField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();

  const commentCreateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateCommentInput') as any;
  expect(commentCreateInput).toBeDefined();
  expect(commentCreateInput.fields.length).toEqual(3);
  expect(commentCreateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(commentCreateInput.fields.find((f: any) => f.name.value === 'content')).toBeDefined();
  expect(commentCreateInput.fields.find((f: any) => f.name.value === 'postCommentsId')).toBeDefined();

  const commentUpdateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateCommentInput') as any;
  expect(commentUpdateInput).toBeDefined();
  expect(commentUpdateInput.fields.length).toEqual(3);
  expect(commentUpdateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(commentUpdateInput.fields.find((f: any) => f.name.value === 'content')).toBeDefined();
  expect(commentUpdateInput.fields.find((f: any) => f.name.value === 'postCommentsId')).toBeDefined();

  const commentType = schema.definitions.find((def: any) => def.name && def.name.value === 'Comment') as any;
  expect(commentType).toBeDefined();

  const commentFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelCommentFilterInput') as any;
  expect(commentFilterInput).toBeDefined();
  expect(commentFilterInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(commentFilterInput.fields.find((f: any) => f.name.value === 'content')).toBeDefined();

  const commentConditionInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelCommentConditionInput') as any;
  expect(commentConditionInput).toBeDefined();
  expect(commentConditionInput.fields.find((f: any) => f.name.value === 'content')).toBeDefined();
});

test('the limit of 100 is used by default', () => {
  const inputSchema = `
    type Post @model {
      id: ID!
      title: String!
      comments: [Comment] @hasMany
    }

    type Comment @model {
      id: ID!
      content: String
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['Post.comments.req.vtl']).toContain('#set( $limit = $util.defaultIfNull($context.args.limit, 100) )');
});

test('the default limit argument can be overridden', () => {
  const inputSchema = `
    type Post @model {
      id: ID!
      title: String!
      comments: [Comment] @hasMany(limit: 50)
    }

    type Comment @model {
      id: ID!
      content: String
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['Post.comments.req.vtl']).toContain('#set( $limit = $util.defaultIfNull($context.args.limit, 50) )');
});

test('validates VTL of a complex schema', () => {
  const inputSchema = `
    type Child @model {
      id: ID! @primaryKey(sortKeyFields: ["name"])
      name: String!
      parents: [Parent] @hasMany(indexName: "byChild", fields: ["id"])
    }

    type Parent @model {
      id: ID!
      childID: ID! @index(name: "byChild", sortKeyFields: ["childName"])
      childName: String!
      child: Child @belongsTo(fields: ["childID", "childName"])
    }

    type User @model {
      id: ID! @primaryKey(sortKeyFields: ["name", "surname"])
      name: String!
      surname: String!
      friendships: [Friendship] @hasMany(indexName: "byUser", fields: ["id"])
    }

    type Friendship @model {
      id: ID!
      userID: ID! @index(name: "byUser", sortKeyFields: ["friendID"])
      friendID: ID!
      friend: [User] @hasMany(fields: ["friendID"])
    }

    type UserModel @model {
      id: ID! @primaryKey(sortKeyFields: ["rollNumber"]) @index(name: "composite", sortKeyFields: ["name", "surname"])
      rollNumber: Int!
      name: String!
      surname: String!
      authorPosts: [PostAuthor] @hasMany(indexName: "byAuthor", fields: ["id"])
    }

    type PostModel @model {
      id: ID!
      authorID: ID!
      authorName: String!
      authorSurname: String!
      postContents: [String]
      authors: [UserModel] @hasMany(indexName: "composite", fields: ["authorID", "authorName", "authorSurname"])
      singleAuthor: User @hasOne(fields: ["authorID", "authorName", "authorSurname"])
    }

    type Post @model {
      id: ID!
      authorID: ID!
      postContents: [String]
      authors: [User] @hasMany(fields: ["authorID"], limit: 50)
    }

    type PostAuthor @model {
        id: ID!
        authorID: ID! @index(name: "byAuthor", sortKeyFields: ["postID"])
        postID: ID!
        post: Post @hasOne(fields: ["postID"])
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [
      new ModelTransformer(),
      new PrimaryKeyTransformer(),
      new IndexTransformer(),
      new HasOneTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
    ],
    transformParameters: {
      respectPrimaryKeyAttributesOnConnectionField: false,
      enableAutoIndexQueryNames: false,
      secondaryKeyAsGSI: false,
    },
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers).toMatchSnapshot();
});

test('@hasMany and @hasMany can point at each other if DataStore is not enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: [Post] @hasMany
    }

    type Post @model {
      id: ID!
      blog: [Blog] @hasMany
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('@hasMany and @hasMany cannot point at each other if DataStore is enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: [Post] @hasMany
    }

    type Post @model {
      id: ID!
      blog: [Blog] @hasMany
    }`;
  expect(() =>
    testTransform({
      schema: inputSchema,
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
        },
      },
      transformers: [new ModelTransformer(), new HasOneTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError('Blog and Post cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead.');
});

test('recursive @hasMany relationships are supported if DataStore is enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: [Blog] @hasMany
    }`;
  const out = testTransform({
    schema: inputSchema,
    resolverConfig: {
      project: {
        ConflictDetection: 'VERSION',
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
      },
    },
    transformers: [new ModelTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('has many with queries null generate correct filter input objects for scalar list type', () => {
  const inputSchema = `
    type Foo @model {
      bars: [Bar] @hasMany
    }

    type Bar @model(queries: null) {
      strings: [String]
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const barFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelBarFilterInput') as any;
  expect(barFilterInput).toBeDefined();

  const stringField = barFilterInput.fields.find((f: any) => f.name.value === 'strings');
  expect(stringField).toBeDefined();
  expect(stringField.type.name.value).toMatch('ModelStringInput');
});

test('has many with queries null generate correct filter input objects for enum type', () => {
  const inputSchema = `
    type IssueList @model {
      id: ID!
      issues: [Issue] @hasMany
    }

    type Issue @model {
      id: ID!
      title: String!
      description: String
      status: IssueStatus!
    }

    enum IssueStatus {
      open
      closed
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const issueFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelIssueFilterInput') as any;
  expect(issueFilterInput).toBeDefined();

  const statusField = issueFilterInput.fields.find((f: any) => f.name.value === 'status');
  expect(statusField).toBeDefined();
  expect(statusField.type.name.value).toMatch('ModelIssueStatusInput');
});

describe('Pre Processing Has Many Tests', () => {
  let transformer: GraphQLTransform;

  beforeEach(() => {
    transformer = new GraphQLTransform({
      transformers: [new ModelTransformer(), new HasManyTransformer()],
    });
  });

  test('Should generate connecting field when one is not provided', () => {
    const schema = `
    type Blog @model {
      id: ID!
      postsField: [Post] @hasMany
    }

    type Post @model {
      id: ID!
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Post', 'blogPostsFieldId')).toBeTruthy();
  });

  test('Should create sort key field when specified on custom primary key', () => {
    const schema = `
    type Blog @model {
      id: ID! @primaryKey(sortKeyFields: ["value"])
      postsField: [Post] @hasMany
      value: String!
    }

    type Post @model {
      id: ID!
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Post', 'blogPostsFieldId')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'Post', 'blogPostsFieldValue', 'String')).toBeTruthy();
  });
});

describe('@hasMany connection field nullability tests', () => {
  test('Should not affect the nullability of connection fields of the other side update input when the @hasMany field is non-nullable', () => {
    const inputSchema = `
      type Todo @model {
        todoid: ID! @primaryKey(sortKeyFields:["name"])
        name: String!
        title: String!
        priority: Int
        tasks: [Task]! @hasMany
      }
      type Task @model {
        taskid: ID! @primaryKey(sortKeyFields:["name"])
        name: String!
        description: String
      }
    `;
    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    const connectionFieldName1 = 'todoTasksTodoid';
    const connectionFieldName2 = 'todoTasksName';
    // Type definition
    const objType = schema.definitions.find((def: any) => def.name && def.name.value === 'Task') as any;
    expect(objType).toBeDefined();
    const relatedField1 = objType.fields.find((f: any) => f.name.value === connectionFieldName1);
    expect(relatedField1).toBeDefined();
    expect(relatedField1.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(relatedField1.type.type.name.value).toBe('ID');
    const relatedField2 = objType.fields.find((f: any) => f.name.value === connectionFieldName2);
    expect(relatedField2).toBeDefined();
    expect(relatedField2.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(relatedField2.type.type.name.value).toBe('String');
    // Create Input
    const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTaskInput') as any;
    expect(createInput).toBeDefined();
    expect(createInput.fields.length).toEqual(5);
    const createInputConnectedField1 = createInput.fields.find((f: any) => f.name.value === connectionFieldName1);
    expect(createInputConnectedField1).toBeDefined();
    expect(createInputConnectedField1.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(createInputConnectedField1.type.type.name.value).toBe('ID');
    const createInputConnectedField2 = createInput.fields.find((f: any) => f.name.value === connectionFieldName2);
    expect(createInputConnectedField2).toBeDefined();
    expect(createInputConnectedField2.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(createInputConnectedField2.type.type.name.value).toBe('String');
    // Update Input
    const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTaskInput') as any;
    expect(updateInput).toBeDefined();
    expect(updateInput.fields.length).toEqual(5);
    const updateInputConnectedField1 = updateInput.fields.find((f: any) => f.name.value === connectionFieldName1);
    expect(updateInputConnectedField1).toBeDefined();
    expect(updateInputConnectedField1.type.kind).toBe(Kind.NAMED_TYPE);
    expect(updateInputConnectedField1.type.name.value).toBe('ID');
    const updateInputConnectedField2 = updateInput.fields.find((f: any) => f.name.value === connectionFieldName2);
    expect(updateInputConnectedField2).toBeDefined();
    expect(updateInputConnectedField2.type.kind).toBe(Kind.NAMED_TYPE);
    expect(updateInputConnectedField2.type.name.value).toBe('String');
  });
});

describe('@hasMany directive with RDS datasource', () => {
  const mySqlStrategy = mockSqlDataSourceStrategy();

  test('happy case should generate correct resolvers', () => {
    const inputSchema = `
      type Blog @model {
        id: String! @primaryKey
        content: String
        posts: [Post] @hasMany(references: ["blogId"])
      }
      type Post @model {
        id: String! @primaryKey
        content: String
        blogId: String
        blog: Blog @belongsTo(references: ["blogId"])
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(inputSchema, mySqlStrategy),
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Blog.posts.req.vtl']).toBeDefined();
    expect(out.resolvers['Blog.posts.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Blog.posts.res.vtl']).toBeDefined();
    expect(out.resolvers['Blog.posts.res.vtl']).toMatchSnapshot();
  });

  test('composite key should generate correct resolvers', () => {
    const inputSchema = `
      type System @model {
        systemId: String! @primaryKey(sortKeyFields: ["systemName"])
        systemName: String!
        details: String
        parts: [Part] @hasMany(references: ["systemId", "systemName"])
      }
      type Part @model {
        partId: String! @primaryKey
        partName: String
        systemId: String!
        systemName: String!
        system: System @belongsTo(references: ["systemId", "systemName"])
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(inputSchema, mySqlStrategy),
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['System.parts.req.vtl']).toBeDefined();
    expect(out.resolvers['System.parts.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['System.parts.res.vtl']).toBeDefined();
    expect(out.resolvers['System.parts.res.vtl']).toMatchSnapshot();
  });
});
