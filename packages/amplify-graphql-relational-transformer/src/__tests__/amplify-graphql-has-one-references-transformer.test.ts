import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '..';

test('fails if @hasOne was used on an object that is not a model type', () => {
  const inputSchema = `
    type Project {
      id: ID!
      name: String
      team: Team @hasOne(references: ["projectID"])
    }

    type Team @model {
      id: ID!
      name: String
      projectID: ID
      project: Project @belongsTo(references: ["projectID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('@hasOne must be on an @model object type field.');
});

test('fails if @hasOne was used with a related type that is not a model', () => {
  const inputSchema = `
    type Project @model {
      id: ID!
      name: String
      team: Team @hasOne(references: ["projectID"])
    }

    type Team {
      id: ID!
      name: String
      projectID: ID
      project: Project @belongsTo(references: ["projectID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError();
  // TODO: Fix error message
  // Currently throws 'Cannot find datasource type for model Team'
  // Should throw 'Object type Team must be annotated with @model.'
});

test('fails if the related type does not exist', () => {
  const inputSchema = `
    type Project @Model {
        id: ID!
        name: String
        team: Team1 @hasOne(references: ["projectID"])
    }

    type Team @model {
        id: ID!
        name: String
        projectID: ID
        project: Project @belongsTo(references: ["projectID"])
    }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Unknown type "Team1". Did you mean "Team"?');
});

test('fails if an empty list of fields is passed in', () => {
  const inputSchema = `
    type Project @Model {
        id: ID!
        name: String
        team: Team @hasOne(references: [])
    }

    type Team @model {
        id: ID!
        name: String
        projectID: ID
        project: Project @belongsTo(references: ["projectID"])
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(); // TODO -- Error message
});

test('fails if any of the fields passed in are not in the related model', () => {
  const inputSchema = `
      type Project @model {
        id: ID!
        name: String
        team: Team @hasOne(references: ["foo"])
    }

    type Team @model {
        id: ID!
        name: String
        projectID: ID
        project: Project @belongsTo(references: ["foo"])
    }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('foo is not a field in Team');
});

test('fails if @hasOne field does not match related type primary key', () => {
  const inputSchema = `
    type Project @model {
        id: ID!
        name: String
        team: Team @hasOne(references: ["projectID"])
    }

    type Team @model {
        id: ID!
        name: String
        projectID: String!
        project: Project @belongsTo(references: ["projectID"])
    }
  `;
  // TODO: Currently not throwing. Need to add some validation that types match.
  // expect(() =>
  //   testTransform({
  //     schema: inputSchema,
  //     transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  //   }),
  // ).toThrowError('projectID field is not of type ID');
});

test('fails if sort key type does not match related type sort key', () => {
  const inputSchema = `
      type Project @model {
        id: ID! @primaryKey(sortKeyFields: ["resourceID"])
        resourceID: ID!
        name: String
        team: Team @hasOne(references: ["projectID", "projectResourceID"])
      }

      type Team @model {
        id: ID!
        name: String
        projectID: ID
        projectResourceID: String
        project: Project @belongsTo(references: ["projectID", "projectResourceID"])
      }
    `;
  // TODO: Currently not throwing. Need to add some validation that types match.
  // expect(() =>
  //   testTransform({
  //     schema: inputSchema,
  //     transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  //   }),
  // ).toThrowError('projectResourceID field is not of type ID');
});

test('fails if partial sort key is provided', () => {
  const inputSchema = `
    type Project @model {
        id: ID! @primaryKey(sortKeyFields: ["resourceID"])
        resourceID: ID!
        name: String
        team: Team @hasOne(references: ["projectID"])
    }

    type Team @model {
        id: ID!
        name: String
        projectID: ID
        project: Project @belongsTo(references: ["projectID"])
    }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('The number of references provided to @hasOne must match the number of primary keys on Project.');
});

test('accepts @hasOne without a sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(references: ["id"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["friendID", "name"])
      friendID: ID!
      name: String!
    }
    `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).not.toThrowError();
});

test('fails if used as a has many relation', () => {
  const inputSchema = `
    type Project @model {
      id: ID!
      email: String!
      team: [Team] @hasOne(references: "projectID")
    }

    type Team @model {
      id: ID! @primaryKey
      name: String!
      projectID: ID
      project: Project @belongsTo(references: "projectID")
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('@hasOne cannot be used with lists. Use @hasMany instead.');
});

test('fails if object type fields are provided', () => {
  const inputSchema = `
  type Project @model {
    id: ID!
    email: String!
    team: [Team] @hasOne(references: "projectID")
  }

  type Team @model {
    id: ID!
    name: String!
    projectID: Test
    project: Project @belongsTo(references: "projectID")
  }

  type Test @model {
    id: ID!
  }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('All references provided to @hasOne must be scalar or enum fields.');
});

test('has one references single partition key', () => {
  const inputSchema = `
    type Project @model {
      name: String
      teamId: String
      team: Team @belongsTo(references: "teamId")
    }

    type Team @model {
      id: String!
      mantra: String
      project: Project @hasOne(references: "teamId")
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasOneTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['Team.project.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.project.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Project.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Project.team.req.vtl']).toMatchSnapshot();
});

test('has one references with partition key + sort key', () => {
  const inputSchema = `
    type Project @model {
      name: String
      teamId: String
      teamMantra: String
      team: Team @belongsTo(references: ["teamId", "teamMantra"])
    }

    type Team @model {
      id: String! @primaryKey(sortKeyFields: ["mantra"])
      mantra: String!
      project: Project @hasOne(references: ["teamId", "teamMantra"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [
      new ModelTransformer(),
      new PrimaryKeyTransformer(),
      new HasOneTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
    ],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['Team.project.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.project.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Project.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Project.team.req.vtl']).toMatchSnapshot();
});

test('has one references with multiple sort keys', () => {
  const inputSchema = `
    type Project @model {
      name: String
      teamId: String
      teamMantra: String
      teamOrganization: String
      team: Team @belongsTo(references: ["teamId", "teamMantra", "teamOrganization"])
    }

    type Team @model {
      id: String! @primaryKey(sortKeyFields: ["mantra", "organization"])
      mantra: String!
      organization: String!
      project: Project @hasOne(references: ["teamId", "teamMantra", "teamOrganization"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [
      new ModelTransformer(),
      new PrimaryKeyTransformer(),
      new HasOneTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
    ],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['Team.project.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.project.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Project.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Project.team.req.vtl']).toMatchSnapshot();
});
