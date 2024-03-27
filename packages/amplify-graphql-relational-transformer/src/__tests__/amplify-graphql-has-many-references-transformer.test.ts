import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ConflictHandlerType, DDB_DEFAULT_DATASOURCE_STRATEGY, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { Kind, parse } from 'graphql';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '..';

test('has many query', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: [Member] @hasMany(references: ["teamID"])
    }
    type Member @model {
      id: ID!
      teamID: ID!
      team: Team @belongsTo(references: ["teamID"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.schema).toMatchSnapshot();
  expect((out.stacks as any).ConnectionStack.Resources.TeammembersResolver).toBeTruthy();

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Team') as any;
  expect(testObjType).toBeDefined();

  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'members');
  expect(relatedField).toBeDefined();
  expect((relatedField.type as any).name.value).toEqual('ModelMemberConnection');
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect(relatedField.arguments.length).toEqual(4);
  expect(relatedField.arguments.find((f: any) => f.name.value === 'filter')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'limit')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'nextToken')).toBeDefined();
  expect(relatedField.arguments.find((f: any) => f.name.value === 'sortDirection')).toBeDefined();

  expect(out.resolvers['Team.members.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.members.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Member.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Member.team.req.vtl']).toMatchSnapshot();
});

test('fails if indexName is provided with references', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: [Member] @hasMany(indexName: "foo", references: ["teamID"])
    }
    type Member @model {
      id: ID!
      teamID: ID! @index(name: "foo")
      team: Team @belongsTo(references: ["teamID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Invalid @hasMany directive on Team.members - indexName is not supported with DDB references.');
});

test('fails if property does not exist on related type with references', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: [Member] @hasMany(references: ["teamID"])
    }
    type Member @model {
      id: ID!
      team: Team @belongsTo(references: ["teamID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('teamID is not a field in Member');
});

test('fails if an empty list of references is passed in', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: [Member] @hasMany(references: [])
    }
    type Member @model {
      id: ID!
      team: Team @belongsTo(references: [])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Invalid @hasMany directive on members - empty references list');
});

test('fails if related type does not exist', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: [Foo] @hasMany(references: ["teamID"])
    }
    type Member @model {
      id: ID!
      teamID: String
      team: Team @belongsTo(references: ["teamID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(); // TODO: Fix validation error messaging - 'Unknown type "Foo". Did you mean "Member"?'
});

test('fails if hasMany related type is not an array', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: Member @hasMany(references: ["teamID"])
    }
    type Member @model {
      id: ID!
      teamID: String
      team: Team @belongsTo(references: ["teamID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(); // TODO: Error message
});

test('fails if uni-directional hasMany', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: [Member] @hasMany(references: ["teamID"])
    }
    type Member @model {
      id: ID!
      teamID: String
      team: Team
    }`;

  // TODO: This should fail -- find appropriate place to validate.
  // expect(() =>
  //   testTransform({
  //     schema: inputSchema,
  //     transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
  //   }),
  // ).toThrowError();
});

test('fails if used as a has one relationship', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: Member @hasMany(references: ["teamID"])
    }
    type Member @model {
      id: ID!
      teamID: String
      team: Team @belongsTo(fields: ["teamID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('@hasMany must be used with a list. Use @hasOne for non-list types.');
});

test('hasMany / hasOne - belongsTo across data source type boundary', () => {
  const mockSqlStrategy = mockSqlDataSourceStrategy();

  const inputDdbSchema = `
    type Member @model {
      name: String
      team: Team @belongsTo(references: "teamId")
      teamId: String
    }

    type Project @model {
      name: String
      teamId: String
      team: Team @belongsTo(references: "teamId")
    }

    type Team @model {
      id: String! @primaryKey
      mantra: String
      members: [Member!] @hasMany(references: "teamId")
      project: Project @hasOne(references: "teamId")
    }
  `;

  const out = testTransform({
    schema: inputDdbSchema,
    transformers: [
      new ModelTransformer(),
      new PrimaryKeyTransformer(),
      new HasOneTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
    ],
    dataSourceStrategies: {
      Member: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Project: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Team: mockSqlStrategy,
    },
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['Team.project.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.project.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Team.members.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.members.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Project.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Project.team.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Member.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Member.team.req.vtl']).toMatchSnapshot();
});

test('many to many query', () => {
  const inputSchema = `
      type Post @model {
        id: ID!
        title: String!
        editors: [PostEditor] @hasMany(references: ["editorID"])
      }
      type PostEditor @model(queries: null) {
        id: ID!
        postID: ID!
        editorID: ID!
        post: Post! @belongsTo(references: ["postID"])
        editor: User! @belongsTo(references: ["editorID"])
      }
      type User @model {
        id: ID!
        username: String!
        posts: [PostEditor] @hasMany(references: ["postID"])
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
    ]
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.schema).toMatchSnapshot();
});
