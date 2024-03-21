import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ConflictHandlerType, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { Kind, parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
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
  expect(out.schema).toMatchSnapshot();
});
