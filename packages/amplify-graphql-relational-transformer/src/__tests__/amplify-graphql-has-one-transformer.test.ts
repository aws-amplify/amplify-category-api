import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  ConflictHandlerType,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  GraphQLTransform,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { DocumentNode, Kind, parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { HasManyTransformer, HasOneTransformer } from '..';
import { hasGeneratedField } from './test-helpers';

test('fails if @hasOne was used on an object that is not a model type', () => {
  const inputSchema = `
    type Test {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('@hasOne must be on an @model object type field.');
});

test('fails if @hasOne was used with a related type that is not a model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(fields: "email")
    }

    type Test1 {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer()],
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
      testObj: Test2 @hasOne(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('Unknown type "Test2". Did you mean "Test" or "Test1"?');
});

test('fails if an empty list of fields is passed in', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: Test1 @hasOne(fields: [])
    }

    type Test1 @model {
      id: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('No fields passed to @hasOne directive.');
});

test('fails if any of the fields passed in are not in the parent model', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String
      testObj: Test1 @hasOne(fields: ["id", "name"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["name"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('name is not a field in Test');
});

test('fails if @hasOne field does not match related type primary key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(fields: ["email"])
    }

    type Test1 @model {
      id: ID!
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('email field is not of type ID');
});

test('fails if sort key type does not match related type sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: "friendID")
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('email field is not of type ID');
});

test('fails if partial sort key is provided', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["friendID", "name"])
      friendID: ID!
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('Invalid @hasOne directive on testObj. Partial sort keys are not accepted.');
});

test('accepts @hasOne without a sort key', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: Test1 @hasOne(fields: ["id"])
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
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    }),
  ).not.toThrowError();
});

test('fails if used as a has many relation', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      testObj: [Test1] @hasOne
    }

    type Test1 @model {
      id: ID! @primaryKey
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('@hasOne cannot be used with lists. Use @hasMany instead.');
});

test('fails if object type fields are provided', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      objField: Test1
      testObj: Test1 @hasOne(fields: ["objField"])
    }

    type Test1 @model {
      id: ID! @primaryKey
      name: String!
    }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('All fields provided to @hasOne must be scalar or enum fields.');
});

test('creates has one relationship with explicit fields', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      otherHalf: Test1 @hasOne(fields: ["id", "email"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email"])
      friendID: ID!
      email: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test') as any;
  expect(testObjType).toBeDefined();
  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'otherHalf');
  expect(relatedField).toBeDefined();
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);

  const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTestInput') as any;
  expect(createInput).toBeDefined();
  expect(createInput.fields.length).toEqual(2);
  expect(createInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();

  const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTestInput') as any;
  expect(updateInput).toBeDefined();
  expect(updateInput.fields.length).toEqual(2);
  expect(updateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
});

test('creates has one relationship with implicit fields', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      otherHalf: Test1 @hasOne
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email"])
      friendID: ID!
      email: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test') as any;
  expect(testObjType).toBeDefined();
  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'otherHalf');
  expect(relatedField).toBeDefined();
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);

  const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTestInput') as any;
  expect(createInput).toBeDefined();
  expect(createInput.fields.length).toEqual(4);
  expect(createInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'testOtherHalfId')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'testOtherHalfEmail')).toBeDefined();

  const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTestInput') as any;
  expect(updateInput).toBeDefined();
  expect(updateInput.fields.length).toEqual(4);
  expect(updateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'testOtherHalfId')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'testOtherHalfEmail')).toBeDefined();
});

test('creates has one relationship with composite sort key.', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String!
      name: String!
      otherHalf: Test1 @hasOne(fields: ["id", "email", "name"])
    }

    type Test1 @model {
      id: ID! @primaryKey(sortKeyFields: ["email", "name"])
      friendID: ID!
      email: String!
      name: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  const testObjType = schema.definitions.find((def: any) => def.name && def.name.value === 'Test') as any;
  expect(testObjType).toBeDefined();
  const relatedField = testObjType.fields.find((f: any) => f.name.value === 'otherHalf');
  expect(relatedField).toBeDefined();
  expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);

  const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTestInput') as any;
  expect(createInput).toBeDefined();
  expect(createInput.fields.length).toEqual(3);
  expect(createInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(createInput.fields.find((f: any) => f.name.value === 'name')).toBeDefined();

  const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTestInput') as any;
  expect(updateInput).toBeDefined();
  expect(updateInput.fields.length).toEqual(3);
  expect(updateInput.fields.find((f: any) => f.name.value === 'id')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'email')).toBeDefined();
  expect(updateInput.fields.find((f: any) => f.name.value === 'name')).toBeDefined();
});

test('@hasOne and @hasMany can point at each other if DataStore is not enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: [Post] @hasMany
    }

    type Post @model {
      id: ID!
      blog: Blog @hasOne
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasOneTransformer(), new HasManyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('@hasOne and @hasOne can point at each other if DataStore is not enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: Post @hasOne
    }

    type Post @model {
      id: ID!
      blog: Blog @hasOne
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new HasOneTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('@hasOne and @hasMany cannot point at each other if DataStore is enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: [Post] @hasMany
    }

    type Post @model {
      id: ID!
      blog: Blog @hasOne
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
  ).toThrowError('Post and Blog cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead.');
});

test('@hasOne and @hasOne cannot point at each other if DataStore is enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: Post @hasOne
    }

    type Post @model {
      id: ID!
      blog: Blog @hasOne
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
      transformers: [new ModelTransformer(), new HasOneTransformer()],
    }),
  ).toThrowError('Blog and Post cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead.');
});

test('recursive @hasOne relationships are supported if DataStore is enabled', () => {
  const inputSchema = `
    type Blog @model {
      id: ID!
      posts: Blog @hasOne
    }`;
  const out = testTransform({
    schema: inputSchema,
    resolverConfig: {
      project: {
        ConflictDetection: 'VERSION',
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
      },
    },
    transformers: [new ModelTransformer(), new HasOneTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

describe('Pre Processing Has One Tests', () => {
  let transformer: GraphQLTransform;
  const hasGeneratedFieldArgument = (doc: DocumentNode, objectType: string, fieldName: string, generatedFieldName: string): boolean => {
    let hasFieldArgument = false;
    doc?.definitions?.forEach((def) => {
      if ((def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension') && def.name.value === objectType) {
        def?.fields?.forEach((field) => {
          if (field.name.value === fieldName) {
            field?.directives?.forEach((dir) => {
              if (dir.name.value === 'hasOne') {
                dir?.arguments?.forEach((arg) => {
                  if (arg.name.value === 'fields') {
                    if (
                      arg.value.kind === 'ListValue' &&
                      arg.value.values[0].kind === 'StringValue' &&
                      arg.value.values[0].value === generatedFieldName
                    ) {
                      hasFieldArgument = true;
                    } else if (arg.value.kind === 'StringValue' && arg.value.value === generatedFieldName) {
                      hasFieldArgument = true;
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
    return hasFieldArgument;
  };

  beforeEach(() => {
    transformer = new GraphQLTransform({
      transformers: [new ModelTransformer(), new HasOneTransformer()],
    });
  });

  test('Should generate connecting field when one is not provided', () => {
    const schema = `
    type Blog @model {
      id: ID!
      blogName: BlogName @hasOne
    }

    type BlogName @model {
      id: ID!
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Blog', 'blogBlogNameId')).toBeTruthy();
    expect(hasGeneratedFieldArgument(updatedSchemaDoc, 'Blog', 'blogName', 'blogBlogNameId')).toBeTruthy();
  });

  test('Should generate connecting field when empty fields are provided', () => {
    const schema = `
    type Blog @model {
      id: ID!
      blogName: BlogName @hasOne(fields: [])
    }

    type BlogName @model {
      id: ID!
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Blog', 'blogBlogNameId')).toBeTruthy();
    expect(hasGeneratedFieldArgument(updatedSchemaDoc, 'Blog', 'blogName', 'blogBlogNameId')).toBeTruthy();
  });

  test('Should not generate connecting field when one is provided', () => {
    const schema = `
    type Blog @model {
      id: ID!
      connectionField: ID
      blogName: BlogName @hasOne(fields: "connectionField")
    }

    type BlogName @model {
      id: ID!
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Blog', 'blogBlogNameId')).toBeFalsy();
    expect(hasGeneratedFieldArgument(updatedSchemaDoc, 'Blog', 'blogName', 'blogBlogNameId')).toBeFalsy();
  });

  test('Should not generate connecting field when a list one is provided', () => {
    const schema = `
    type Blog @model {
      id: ID!
      connectionField: ID
      blogName: BlogName @hasOne(fields: ["connectionField"])
    }

    type BlogName @model {
      id: ID!
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Blog', 'blogBlogNameId')).toBeFalsy();
    expect(hasGeneratedFieldArgument(updatedSchemaDoc, 'Blog', 'blogName', 'blogBlogNameId')).toBeFalsy();
  });

  test('Should generate additional matching sort key fields when connected to primary key with sort keys', () => {
    const schema = `
    type Blog @model {
      id: ID!
      connectionField: ID
      arbitraryField: BlogName @hasOne
    }

    type BlogName @model {
      id: ID! @primaryKey(sortKeyFields: ["thing"])
      thing: String
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'Blog', 'blogArbitraryFieldThing', 'String')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'Blog', 'blogArbitraryFieldId')).toBeTruthy();
  });
});

describe('@hasOne connection field nullability tests', () => {
  test('Should generate nullable connection fields in type definition and create/update input when hasOne field is nullable', () => {
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
      }
    `;
    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    const connectionFieldName1 = 'todoTaskTaskid';
    const connectionFieldName2 = 'todoTaskName';
    // Type definition
    const objType = schema.definitions.find((def: any) => def.name && def.name.value === 'Todo') as any;
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
    const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTodoInput') as any;
    expect(createInput).toBeDefined();
    expect(createInput.fields.length).toEqual(6);
    const createInputConnectedField1 = createInput.fields.find((f: any) => f.name.value === connectionFieldName1);
    expect(createInputConnectedField1).toBeDefined();
    expect(createInputConnectedField1.type.kind).toBe(Kind.NAMED_TYPE);
    expect(createInputConnectedField1.type.name.value).toBe('ID');
    const createInputConnectedField2 = createInput.fields.find((f: any) => f.name.value === connectionFieldName2);
    expect(createInputConnectedField2).toBeDefined();
    expect(createInputConnectedField2.type.kind).toBe(Kind.NAMED_TYPE);
    expect(createInputConnectedField2.type.name.value).toBe('String');
    // Update Input
    const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTodoInput') as any;
    expect(updateInput).toBeDefined();
    expect(updateInput.fields.length).toEqual(6);
    const updateInputConnectedField1 = updateInput.fields.find((f: any) => f.name.value === connectionFieldName1);
    expect(updateInputConnectedField1).toBeDefined();
    expect(updateInputConnectedField1.type.kind).toBe(Kind.NAMED_TYPE);
    expect(updateInputConnectedField1.type.name.value).toBe('ID');
    const updateInputConnectedField2 = updateInput.fields.find((f: any) => f.name.value === connectionFieldName2);
    expect(updateInputConnectedField2).toBeDefined();
    expect(updateInputConnectedField2.type.kind).toBe(Kind.NAMED_TYPE);
    expect(updateInputConnectedField2.type.name.value).toBe('String');
  });

  test('Should generate non-nullable connection fields in type definition and create input while keeping nullable in update input when hasOne field is non-nullable', () => {
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
      }
    `;
    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
    const connectionFieldName1 = 'todoTaskTaskid';
    const connectionFieldName2 = 'todoTaskName';
    // Type definition
    const objType = schema.definitions.find((def: any) => def.name && def.name.value === 'Todo') as any;
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
    const createInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateTodoInput') as any;
    expect(createInput).toBeDefined();
    expect(createInput.fields.length).toEqual(6);
    const createInputConnectedField1 = createInput.fields.find((f: any) => f.name.value === connectionFieldName1);
    expect(createInputConnectedField1).toBeDefined();
    expect(createInputConnectedField1.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(createInputConnectedField1.type.type.name.value).toBe('ID');
    const createInputConnectedField2 = createInput.fields.find((f: any) => f.name.value === connectionFieldName2);
    expect(createInputConnectedField2).toBeDefined();
    expect(createInputConnectedField2.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(createInputConnectedField2.type.type.name.value).toBe('String');
    // Update Input
    const updateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateTodoInput') as any;
    expect(updateInput).toBeDefined();
    expect(updateInput.fields.length).toEqual(6);
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
