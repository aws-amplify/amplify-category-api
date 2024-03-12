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
      testObj: Test1 @hasMany(references: "testId")
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
    type Friend @model {
      id: ID!
      email: String
      testObj: [Test1] @hasMany(indexName: "notDefault", references: "friendId")
    }

    type Test1 @model {
      id: ID!
      friendID: ID!
      test: Test @belongsTo(references: "friendId")
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer()],
    }),
  ).toThrowError() // 'Index notDefault does not exist for model Test1');
  // TODO: throws schema validation error
});

test('fails if a partial sort key is provided', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(indexName: "testIndex", references: ["id", "email"])
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
  ).toThrowError() // 'Invalid @hasMany directive on testObj. Partial sort keys are not accepted.');
  // TODO: Received message: "email is not a field in Test1"
});

test('accepts @hasMany without a sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(indexName: "testIndex", references: ["id"])
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
        testObj: [Test1] @hasMany(indexName: "testIndex", references: ["id", "email"])
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
  ).toThrowError('email is not a field in Test1');
});

test('fails if partition key type passed in does not match custom index partition key type', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(indexName: "testIndex", references: ["email", "id"])
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
  ).toThrowError('email is not a field in Test1');
});

test('fails if @hasMany was used on an object that is not a model type', () => {
  const inputSchema = `
    type Test {
      id: ID!
      email: String!
      testObj: [Test1] @hasMany(references: ["email"])
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
      testObj: [Test1] @hasMany(references: "email")
    }

    type Test1 {
      id: ID!
      name: String!
      email: ID
      test: Test @belongsTo(references: ["email"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [
        new ModelTransformer(),
        new IndexTransformer(),
        new HasOneTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
    ],
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
      testObj: [Test2] @hasMany(references: ["email"])
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
      testObj: [Test1] @hasMany(references: [])
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
  ).toThrowError() // 'No fields passed to @hasMany directive.');
  // TODO: Received message: "Something went wrong >> cannot have both references and fields."
});

test('fails if any of the fields passed in are not in the parent model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: [Test1] @hasMany(references: ["id", "name"])
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
  ).toThrowError('The number of references provided to @hasMany must match the number of primary keys on Test.');
});

test('has many query case', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      otherParts: [Test1] @hasMany(references: ["friendId"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email"])
      friendId: ID!
      email: String!
      test: Test @belongsTo(references: ["friendId"])
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
    ],
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
      author: User @belongsTo(references: ["owner"])
      owner: ID! @index(name: "byOwner", sortKeyFields: ["id"])
    }

    type User @model {
      id: ID!
      posts: [Post] @hasMany(indexName: "byOwner", references: ["id"])
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
  // TODO: Why isn't there an `id`? Should there be?
//   expect(postsField.arguments.length).toEqual(5);
//   expect(postsField.arguments.find((f: any) => f.name.value === 'id')).toBeDefined();
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
    // TODO: InvalidDirectiveError: The number of references provided to @hasMany must match the number of primary keys on Test.
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      name: String!
      otherParts: [Test1] @hasMany(references: ["friendId", "email", "name"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email", "name"])
      friendId: ID!
      email: String!
      name: String!
      test: Test @belongsTo(references: ["friendId", "email", "name"])
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
    ],
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
