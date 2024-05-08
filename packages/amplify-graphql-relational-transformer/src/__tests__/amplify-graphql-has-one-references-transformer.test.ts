import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { Kind, parse } from 'graphql';
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
  ).toThrowError('Object type Team must be annotated with @model.');
});

test('fails if the related type does not exist', () => {
  const inputSchema = `
    type Project @model {
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
    type Project @model {
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
  ).toThrowError('Invalid @hasOne directive on team - empty references list');
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
        projectID: Int!
        project: Project @belongsTo(references: ["projectID"])
    }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(
    'Type mismatch between primary key field(s) of Project and reference fields of Team. Type of Project.id does not match type of Team.projectID',
  );
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
        projectResourceID: Int
        project: Project @belongsTo(references: ["projectID", "projectResourceID"])
      }
    `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(
    'Type mismatch between primary key field(s) of Project and reference fields of Team. Type of Project.resourceID does not match type of Team.projectResourceID',
  );
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

test('uni-directional @hasOne fails', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(references: ["id"])
    }

    type Test1 @model {
      id: ID!
      friendID: ID!
      name: String!
    }
    `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(
    'Uni-directional relationships are not supported. Add a @belongsTo field in Test1 to match the @hasOne field Test.testObj',
  );
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
  ).toThrowError('All reference fields provided to @hasOne must be scalar or enum fields.');
});

test('fails if primary relational field is required', () => {
  const inputSchema = `
  type Project @model {
    name: String
    teamId: String
    team: Team @belongsTo(references: "teamId")
  }

  type Team @model {
    id: String!
    mantra: String
    project: Project! @hasOne(references: "teamId")
  }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError("@hasOne fields must not be required. Change 'Team.project: Project!' to 'Team.project: Project'");
});

test('fails if related relational field is required', () => {
  const inputSchema = `
  type Project @model {
    name: String
    teamId: String
    team: Team! @belongsTo(references: "teamId")
  }

  type Team @model {
    id: String!
    mantra: String
    project: Project @hasOne(references: "teamId")
  }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError("@belongsTo fields must not be required. Change 'Project.team: Team!' to 'Project.team: Team'");
});

test('fails with inconsistent nullability of reference fields', () => {
  const inputSchema = `
    type Project @model {
      name: String
      teamId: String!
      teamMantra: String
      team: Team @belongsTo(references: ["teamId", "teamMantra"])
    }

    type Team @model {
      id: String! @primaryKey(sortKeyFields: ["mantra"])
      mantra: String!
      project: Project @hasOne(references: ["teamId", "teamMantra"])
    }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError(
    "Reference fields defined on related type: 'Project' for @hasOne(references: ['teamId', 'teamMantra']) Team.project relationship have inconsistent nullability." +
      "\nRequired fields: 'teamId'" +
      "\nNullable fields: 'teamMantra'" +
      "\nUpdate reference fields on type 'Project' to have consistent nullability -- either all required or all nullable.",
  );
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
  expect(out.resolvers).toBeDefined();
  expect(out.resolvers).toMatchSnapshot();
  expect(out.resolvers['Team.project.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.project.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Project.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Project.team.req.vtl']).toMatchSnapshot();
});

test('has one query with implicit IDs', () => {
  const inputSchema = `
    type Team @model {
      name: String!
      members: Member @hasOne(references: ["teamID"])
    }
    type Member @model {
      teamID: ID!
      team: Team @belongsTo(references: ["teamID"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
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
  expect((relatedField.type as any).name.value).toEqual('Member');
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);
  expect(relatedField.arguments.length).toEqual(0);

  expect(out.resolvers['Team.members.req.vtl']).toBeDefined();
  expect(out.resolvers['Team.members.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Member.team.req.vtl']).toBeDefined();
  expect(out.resolvers['Member.team.req.vtl']).toMatchSnapshot();
});

test('fails if reference field has different type than primary key with implicit id and primary key', () => {
  const inputSchema = `
    type Team @model {
      name: String!
      members: Member @hasOne(references: ["teamID"])
    }
    type Member @model {
      teamID: Int
      team: Team @belongsTo(references: ["teamID"])
    }
  `;

  const transformOptions = {
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  };
  expect(() => testTransform(transformOptions)).toThrowError(
    'Type mismatch between primary key field(s) of Team and reference fields of Member. Type of Team.id does not match type of Member.teamID',
  );
});

test('fails if reference field has different type than primary key with explicit id and implicit primary key', () => {
  const inputSchema = `
    type Team @model {
      id: ID!
      name: String!
      members: Member @hasOne(references: ["teamID"])
    }
    type Member @model {
      teamID: Int
      team: Team @belongsTo(references: ["teamID"])
    }
  `;

  const transformOptions = {
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  };
  expect(() => testTransform(transformOptions)).toThrowError(
    'Type mismatch between primary key field(s) of Team and reference fields of Member. Type of Team.id does not match type of Member.teamID',
  );
});

test('fails if reference field has different type than primary key with explicit id and explicit primary key', () => {
  const inputSchema = `
    type Team @model {
      id: ID! @primaryKey
      name: String!
      members: Member @hasOne(references: ["teamID"])
    }
    type Member @model {
      teamID: Int
      team: Team @belongsTo(references: ["teamID"])
    }
  `;

  const transformOptions = {
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  };
  expect(() => testTransform(transformOptions)).toThrowError(
    'Type mismatch between primary key field(s) of Team and reference fields of Member. Type of Team.id does not match type of Member.teamID',
  );
});

test('fails to validate if reference lengths do not match', () => {
  const inputSchema = /* GraphQL */ `
    type Primary @model {
      content: String
      related: Related @hasOne(references: ["primaryPk"])
    }

    type Related @model {
      content: String
      primaryPk: ID
      primarySk: ID
      primary: Primary @belongsTo(references: ["primaryPk", "primarySk"])
    }
  `;

  const transformParams = {
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  };

  expect(() => testTransform(transformParams)).toThrowError(
    'Uni-directional relationships are not supported. Add a @belongsTo field in Related to match the @hasOne field Primary.related, and ' +
      'ensure the number and type of reference fields match the number and type of primary key fields in Primary.',
  );
});

test('has one references with multiple relationships to the same model', () => {
  const inputSchema = /* GraphQL */ `
    type Primary @model {
      content: String
      related1: Related @hasOne(references: ["primaryId1"])
      related2: Related @hasOne(references: ["primaryId2"])
    }

    type Related @model {
      content: String
      primaryId1: ID
      primaryId2: ID
      primary1: Primary @belongsTo(references: ["primaryId1"])
      primary2: Primary @belongsTo(references: ["primaryId2"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  // The important assertions for Primary.related* are that the GSI being used to query is associated with the correct field
  expect(out.resolvers['Primary.related1.req.vtl']).toBeDefined();
  expect(out.resolvers['Primary.related1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Primary.related1.req.vtl']).toContain('"index": "gsi-Primary.related1"');
  expect(out.resolvers['Primary.related2.req.vtl']).toBeDefined();
  expect(out.resolvers['Primary.related2.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Primary.related2.req.vtl']).toContain('"index": "gsi-Primary.related2"');

  // The important assertions for Related.primary* are that the correct reference field is being used for primary lookup
  expect(out.resolvers['Related.primary1.req.vtl']).toBeDefined();
  expect(out.resolvers['Related.primary1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Related.primary1.req.vtl']).toContain('connectionAttibutes.get("primaryId1")');
  expect(out.resolvers['Related.primary2.req.vtl']).toBeDefined();
  expect(out.resolvers['Related.primary2.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Related.primary2.req.vtl']).toContain('connectionAttibutes.get("primaryId2")');
});

test('has one references with multiple relationships to the same model with composite primary key', () => {
  const inputSchema = /* GraphQL */ `
    type Primary @model {
      pk: ID! @primaryKey(sortKeyFields: ["sk1", "sk2"])
      sk1: ID!
      sk2: ID!
      content: String
      related1: Related @hasOne(references: ["primaryPk1", "primarySk11", "primarySk12"])
      related2: Related @hasOne(references: ["primaryPk2", "primarySk21", "primarySk22"])
    }

    type Related @model {
      content: String
      primaryPk1: ID
      primarySk11: ID
      primarySk12: ID
      primaryPk2: ID
      primarySk21: ID
      primarySk22: ID
      primary1: Primary @belongsTo(references: ["primaryPk1", "primarySk11", "primarySk12"])
      primary2: Primary @belongsTo(references: ["primaryPk2", "primarySk21", "primarySk22"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  // The important assertions for Primary.related* are that the GSI being used to query is associated with the correct field
  expect(out.resolvers['Primary.related1.req.vtl']).toBeDefined();
  expect(out.resolvers['Primary.related1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Primary.related1.req.vtl']).toContain('"index": "gsi-Primary.related1"');

  expect(out.resolvers['Primary.related2.req.vtl']).toBeDefined();
  expect(out.resolvers['Primary.related2.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Primary.related2.req.vtl']).toContain('"index": "gsi-Primary.related2"');

  // The important assertions for Related.primary* are that the correct reference field is being used for primary lookup
  expect(out.resolvers['Related.primary1.req.vtl']).toBeDefined();
  expect(out.resolvers['Related.primary1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Related.primary1.req.vtl']).toContain('connectionAttibutes.get("primaryPk1")');
  // eslint-disable-next-line no-template-curly-in-string
  expect(out.resolvers['Related.primary1.req.vtl']).toContain('"${ctx.source.primarySk11}#${ctx.source.primarySk12}"');

  expect(out.resolvers['Related.primary2.req.vtl']).toBeDefined();
  expect(out.resolvers['Related.primary2.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Related.primary2.req.vtl']).toContain('connectionAttibutes.get("primaryPk2")');
  // eslint-disable-next-line no-template-curly-in-string
  expect(out.resolvers['Related.primary2.req.vtl']).toContain('"${ctx.source.primarySk21}#${ctx.source.primarySk22}"');
});

test('supports recursive schemas', () => {
  const inputSchema = /* GraphQL */ `
    type TreeNode @model {
      pk: ID!
      value: String
      parentId: ID
      parent: TreeNode @belongsTo(references: ["parentId"])
      child: TreeNode @hasOne(references: ["parentId"])
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  // The important assertion for `child` is that the GSI being used to query is associated with the `parentId` field
  expect(out.resolvers['TreeNode.child.req.vtl']).toBeDefined();
  expect(out.resolvers['TreeNode.child.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['TreeNode.child.req.vtl']).toContain('"index": "gsi-TreeNode.child"');
  expect(out.resolvers['TreeNode.child.req.vtl']).toContain('"#partitionKey": "parentId"');

  // The important assertion for `parent` is that the query is being performed on the `parentId` field
  expect(out.resolvers['TreeNode.parent.req.vtl']).toBeDefined();
  expect(out.resolvers['TreeNode.parent.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['TreeNode.parent.req.vtl']).toContain('connectionAttibutes.get("parentId")');
});
