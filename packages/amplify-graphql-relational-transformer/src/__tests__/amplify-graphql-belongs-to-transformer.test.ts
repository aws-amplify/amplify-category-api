import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode, Kind, parse } from 'graphql';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '..';

test('fails if @belongsTo was used on an object that is not a model type', () => {
  const inputSchema = `
    type Test {
      id: ID!
      email: String!
      testObj: Test1 @belongsTo(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('@belongsTo must be on an @model object type field.');
});

test('fails if @belongsTo was used with a related type that is not a model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @belongsTo(fields: "email")
    }

    type Test1 {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Object type Test1 must be annotated with @model.');
});

test('fails if the related type does not exist', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test2 @belongsTo(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Unknown type "Test2". Did you mean "Test" or "Test1"?');
});

test('fails if an empty list of fields is passed in', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: Test1 @belongsTo(fields: [])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('No fields passed to @belongsTo directive.');
});

test('fails if any of the fields passed in are not in the parent model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: Test1 @belongsTo(fields: ["id", "name"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["name"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('name is not a field in Test');
});

test('fails if @belongsTo field does not match related type primary key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @belongsTo(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      friendID: ID!
      name: String!
      test: Test @hasOne
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('email field is not of type ID');
});

test('fails if sort key type does not match related type sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @belongsTo(fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: "friendID")
      friendID: ID!
      name: String!
      test: Test @hasOne
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('email field is not of type ID');
});

test('fails if partial sort key is provided', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @belongsTo(fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["friendID", "name"])
      friendID: ID!
      name: String!
      test: Test @hasOne
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Invalid @belongsTo directive on testObj. Partial sort keys are not accepted.');
});

test('accepts @belongsTo without a sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @belongsTo(fields: ["id"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["friendID", "name"])
      friendID: ID!
      name: String!
      test: Test @hasOne
    }
    `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).not.toThrowError();
});

test('fails if used on a list field', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @belongsTo
    }

    type Test1 @model {
      id: ID! @primaryKey
      name: String!
      test: Test @hasOne
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('@belongsTo cannot be used with lists.');
});

test('fails if object type fields are provided', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      objField: Test1
      testObj: Test1 @belongsTo(fields: ["objField"])
    }

    type Test1 @model {
      id: ID! @primaryKey
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('All fields provided to @belongsTo must be scalar or enum fields.');
});

test('fails if a bidirectional relationship does not exist', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1
    }

    type Test1 @model {
      id: ID!
      name: String!
      owner: Test @belongsTo
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new BelongsToTransformer()],
    }),
  ).toThrowError('Test must have a relationship with Test1 in order to use @belongsTo.');
});

test('creates belongs to relationship with implicit fields', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      otherHalf: Test1 @hasOne
    }

    type Test1 @model {
      id: ID!
      friendID: ID!
      email: String!
      otherHalf2: Test @belongsTo
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const test1ObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test1') as any;
  expect(test1ObjType).toBeDefined();
  const relatedField = test1ObjType.fields.find((f: any) => f.name.value === 'otherHalf2');
  expect(relatedField).toBeDefined();
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);

  const create1Input = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTest1Input') as any;
  expect(create1Input).toBeDefined();
  expect(create1Input.fields.length).toEqual(4);
  expect(create1Input.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(create1Input.fields.find((f: any) => f.name.value === 'friendID')).toBeDefined();
  expect(create1Input.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(create1Input.fields.find((f: any) => f.name.value === 'test1OtherHalf2Id')).toBeDefined();

  const update1Input = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTest1Input') as any;
  expect(update1Input).toBeDefined();
  expect(update1Input.fields.length).toEqual(4);
  expect(update1Input.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(update1Input.fields.find((f: any) => f.name.value === 'friendID')).toBeDefined();
  expect(update1Input.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(update1Input.fields.find((f: any) => f.name.value === 'test1OtherHalf2Id')).toBeDefined();

  const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTestInput') as any;
  expect(createInput).toBeDefined();
  expect(createInput.fields.length).toEqual(3);
  expect(createInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'testOtherHalfId')).toBeDefined();

  const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTestInput') as any;
  expect(updateInput).toBeDefined();
  expect(updateInput.fields.length).toEqual(3);
  expect(updateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'testOtherHalfId')).toBeDefined();
});

test('regression test for implicit id field on related type', () => {
  const inputSchema = `
    type BatteryCharger @model {
      powerSourceID: ID
      powerSource: PowerSource @hasOne(fields: ["powerSourceID"])
    }

    type PowerSource @model {
      sourceID: ID!
      chargerID: ID
      charger: BatteryCharger @belongsTo(fields: ["chargerID"])
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('support for belongs to with Int fields', () => {
  const inputSchema = `
    type ItemBank @model {
      bankId: Int! @primaryKey
      bankName: String!
      bankDescription: String!
      bankItems: [ExamItem] @hasMany(indexName: "byBank", fields: ["bankId"])
    }

    type ExamItem @model {
      examItemId: Int! @primaryKey
      currentIterationId: Int!
      owningBankId: Int! @index(name: "byBank", sortKeyFields: ["examItemId"])
      owningBank: ItemBank @belongsTo(fields: ["owningBankId"])
    }`;

  const out = testTransform({
    schema: inputSchema,
    transformers: [
      new ModelTransformer(),
      new PrimaryKeyTransformer(),
      new IndexTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
    ],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.resolvers['ExamItem.owningBank.req.vtl']).toContain(
    '#set( $partitionKeyValue = $util.defaultIfNull($ctx.stash.connectionAttibutes.get("owningBankId"), $ctx.source.owningBankId) )',
  );
  expect(out.resolvers['ExamItem.owningBank.req.vtl']).toContain('$util.defaultIfNull($partitionKeyValue, "___xamznone____"))');
  expect(out.resolvers['ExamItem.owningBank.req.vtl']).not.toContain(
    '$util.defaultIfNullOrBlank($ctx.source.owningBankId, "___xamznone____"))',
  );
});

describe('Pre Processing Belongs To Tests', () => {
  let transformer: GraphQLTransform;
  const hasGeneratedField = (doc: DocumentNode, objectType: string, fieldName: string): boolean => {
    let hasField = false;
    let doubleHasField = false;
    doc?.definitions?.forEach((def) => {
      if ((def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension') && def.name.value === objectType) {
        def?.fields?.forEach((field) => {
          if (hasField && field.name.value === fieldName) {
            doubleHasField = true;
          } else if (field.name.value === fieldName) {
            hasField = true;
          }
        });
      }
    });
    return doubleHasField ? false : hasField;
  };

  beforeEach(() => {
    transformer = new GraphQLTransform({
      transformers: [new ModelTransformer(), new HasManyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    });
  });

  test('Should generate connecting field for a has one', () => {
    const schema = `
    type Blog @model {
      id: ID!
      postsField: Post @hasOne
    }

    type Post @model {
      id: ID!
      blogField: Blog @belongsTo
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Post', 'postBlogFieldId')).toBeTruthy();
  });

  test("Should not generate extra connecting field for a has many, there's already a route back to parent", () => {
    const schema = `
    type Blog @model {
      id: ID!
      postsField: [Post] @hasMany
    }

    type Post @model {
      id: ID!
      blogField: Blog @belongsTo
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Post', 'postBlogFieldId')).toBeFalsy();
    expect(hasGeneratedField(updatedSchemaDoc, 'Post', 'blogPostsFieldId')).toBeTruthy();
  });
});

test('Should not resolve to secondary index of connected model if the index is defined', () => {
  const inputSchema = `
    type Post @model {
      customId: ID! @primaryKey(sortKeyFields:["content"])
      content: String! @index
      comments: [Comment] @hasMany(indexName:"byParent", fields:["customId", "content"])
    }

    type Comment @model {
      childId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      parent: Post @belongsTo(fields:["parentId", "parentTitle"])
      parentId: ID @index(name: "byParent", sortKeyFields:["parentTitle"])
      parentTitle: String
    }
  `;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new IndexTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    }),
  ).not.toThrow();
});

describe('@belongsTo connection field nullability tests', () => {
  describe('@belongsTo with @hasOne', () => {
    test('Should generate nullable connection fields in type definition and create/update input when belongsTo field is nullable', () => {
      const inputSchema = `
        type Todo @model {
          todoid: ID! @primaryKey(sortKeyFields:["name"])
          name: String!
          title: String!
          priority: Int
          task: Task @hasOne
        }
        type Task @model {
          taskid: ID! @primaryKey(sortKeyFields:["name"])
          name: String!
          description: String
          todo: Todo @belongsTo
        }
      `;
      const out = testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
      });

      expect(out).toBeDefined();
      const schema = parse(out.schema);
      validateModelSchema(schema);
      const connectionFieldName1 = 'taskTodoTodoid';
      const connectionFieldName2 = 'taskTodoName';
      // Type definition
      const objType = schema.definitions.find((def: any) => def.name && def.name.value === 'Task') as any;
      expect(objType).toBeDefined();
      const relatedField1 = objType.fields.find((f: any) => f.name.value === connectionFieldName1);
      expect(relatedField1).toBeDefined();
      expect(relatedField1.type.kind).toBe(Kind.NAMED_TYPE);
      expect(relatedField1.type.name.value).toBe('ID');
      const relatedField2 = objType.fields.find((f: any) => f.name.value === connectionFieldName2);
      expect(relatedField2).toBeDefined();
      expect(relatedField2.type.kind).toBe(Kind.NAMED_TYPE);
      expect(relatedField2.type.name.value).toBe('String');
      // Create Input
      const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTaskInput') as any;
      expect(createInput).toBeDefined();
      expect(createInput.fields.length).toEqual(5);
      const createInputConnectedField1 = createInput.fields.find((f: any) => f.name.value === connectionFieldName1);
      expect(createInputConnectedField1).toBeDefined();
      expect(createInputConnectedField1.type.kind).toBe(Kind.NAMED_TYPE);
      expect(createInputConnectedField1.type.name.value).toBe('ID');
      const createInputConnectedField2 = createInput.fields.find((f: any) => f.name.value === connectionFieldName2);
      expect(createInputConnectedField2).toBeDefined();
      expect(createInputConnectedField2.type.kind).toBe(Kind.NAMED_TYPE);
      expect(createInputConnectedField2.type.name.value).toBe('String');
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

    test('Should generate non-nullable connection fields in type definition and create input while keeping nullable in update input when belongsTo field is non-nullable', () => {
      const inputSchema = `
        type Todo @model {
          todoid: ID! @primaryKey(sortKeyFields:["name"])
          name: String!
          title: String!
          priority: Int
          task: Task! @hasOne
        }
        type Task @model {
          taskid: ID! @primaryKey(sortKeyFields:["name"])
          name: String!
          description: String
          todo: Todo! @belongsTo
        }
      `;
      const out = testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
      });

      expect(out).toBeDefined();
      const schema = parse(out.schema);
      validateModelSchema(schema);
      const connectionFieldName1 = 'taskTodoTodoid';
      const connectionFieldName2 = 'taskTodoName';
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

  describe('@belongsTo with @hasMany', () => {
    test('Should generate nullable connection fields in type definition and create/update input when hasMany field is nullable', () => {
      const inputSchema = `
        type Todo @model {
          todoid: ID! @primaryKey(sortKeyFields:["name"])
          name: String!
          title: String!
          priority: Int
          tasks: [Task] @hasMany
        }
        type Task @model {
          taskid: ID! @primaryKey(sortKeyFields:["name"])
          name: String!
          description: String
          todo: Todo! @belongsTo
        }
      `;
      const out = testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
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
      expect(relatedField1.type.kind).toBe(Kind.NAMED_TYPE);
      expect(relatedField1.type.name.value).toBe('ID');
      const relatedField2 = objType.fields.find((f: any) => f.name.value === connectionFieldName2);
      expect(relatedField2).toBeDefined();
      expect(relatedField2.type.kind).toBe(Kind.NAMED_TYPE);
      expect(relatedField2.type.name.value).toBe('String');
      // Create Input
      const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTaskInput') as any;
      expect(createInput).toBeDefined();
      expect(createInput.fields.length).toEqual(5);
      const createInputConnectedField1 = createInput.fields.find((f: any) => f.name.value === connectionFieldName1);
      expect(createInputConnectedField1).toBeDefined();
      expect(createInputConnectedField1.type.kind).toBe(Kind.NAMED_TYPE);
      expect(createInputConnectedField1.type.name.value).toBe('ID');
      const createInputConnectedField2 = createInput.fields.find((f: any) => f.name.value === connectionFieldName2);
      expect(createInputConnectedField2).toBeDefined();
      expect(createInputConnectedField2.type.kind).toBe(Kind.NAMED_TYPE);
      expect(createInputConnectedField2.type.name.value).toBe('String');
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

    test('Should generate non-nullable connection fields in type definition and create input while keeping nullable in update input when hasMany field is non-nullable', () => {
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
          todo: Todo @belongsTo
        }
      `;
      const out = testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
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
});

describe('@belongsTo directive with RDS datasource', () => {
  const mySqlStrategy = mockSqlDataSourceStrategy();

  test('happy case should generate correct resolvers', () => {
    const inputSchema = `
      type User @model {
        id: String! @primaryKey
        name: String
        profile: Profile @hasOne(references: ["userId"])
      }
      type Profile @model {
        id: String! @primaryKey
        createdAt: AWSDateTime
        userId: String!
        user: User @belongsTo(references: ["userId"])
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(inputSchema, mySqlStrategy),
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Profile.user.req.vtl']).toBeDefined();
    expect(out.resolvers['Profile.user.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Profile.user.res.vtl']).toBeDefined();
    expect(out.resolvers['Profile.user.res.vtl']).toMatchSnapshot();
  });

  test('composite key should generate correct resolvers', () => {
    const inputSchema = `
      type User @model {
        firstName: String! @primaryKey(sortKeyFields: ["lastName"])
        lastName: String!
        profile: Profile @hasOne(references: ["userFirstName", "userLastName"])
      }
      type Profile @model {
        profileId: String! @primaryKey
        userFirstName: String
        userLastName: String
        user: User @belongsTo(references: ["userFirstName", "userLastName"])
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(inputSchema, mySqlStrategy),
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Profile.user.req.vtl']).toBeDefined();
    expect(out.resolvers['Profile.user.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Profile.user.res.vtl']).toBeDefined();
    expect(out.resolvers['Profile.user.res.vtl']).toMatchSnapshot();
  });

  test('set custom index name for hasOne with references', () => {
    const inputSchema = /* GraphQL */ `
      type Blog @model {
        comment: Comment @hasOne(references: ["blogId"])
      }

      type Comment @model {
        blogId: ID
        blog: Blog @belongsTo(references: ["blogId"], overrideIndexName: "byBlog")
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    });
    expect(out.resolvers['Blog.comment.req.vtl']).toBeDefined();
    expect(out.resolvers['Blog.comment.req.vtl']).toMatchSnapshot();
    expect(out.stacks.Comment.Resources?.CommentTable.Properties.GlobalSecondaryIndexes).toMatchSnapshot();
  });

  test('fails if the using indexName on hasOne without references', () => {
    const inputSchema = /* GraphQL */ `
      type Blog @model {
        comment: Comment @hasOne
      }
      type Comment @model {
        blog: Blog @belongsTo(overrideIndexName: "byBlog")
      }
    `;
    expect(() =>
      testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
      }),
    ).toThrowError(
      'overrideIndexName cannot be used on @belongsTo without references. Modify Comment.blog to use references or remove overrideIndexName.',
    );
  });

  test('set custom index name for hasMany with references', () => {
    const inputSchema = /* GraphQL */ `
      type Blog @model {
        comments: [Comment] @hasMany(references: ["blogId"])
      }

      type Comment @model {
        blogId: ID
        blog: Blog @belongsTo(references: ["blogId"], overrideIndexName: "byBlog")
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    });
    expect(out.resolvers['Blog.comments.req.vtl']).toBeDefined();
    expect(out.resolvers['Blog.comments.req.vtl']).toMatchSnapshot();
    expect(out.stacks.Comment.Resources?.CommentTable.Properties.GlobalSecondaryIndexes).toMatchSnapshot();
  });

  test('fails if the using indexName on hasMany without references', () => {
    const inputSchema = /* GraphQL */ `
      type Blog @model {
        comments: [Comment] @hasMany
      }
      type Comment @model {
        blog: Blog @belongsTo(overrideIndexName: "byBlog")
      }
    `;
    expect(() =>
      testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
      }),
    ).toThrowError(
      'overrideIndexName cannot be used on @belongsTo without references. Modify Comment.blog to use references or remove overrideIndexName.',
    );
  });
});
