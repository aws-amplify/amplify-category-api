import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  ConflictHandlerType,
  constructDataSourceStrategies,
  DDB_DB_TYPE,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  MYSQL_DB_TYPE,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { Template as AssertionTemplate } from 'aws-cdk-lib/assertions';
import { DocumentNode, parse } from 'graphql';
import {
  AmplifyApiGraphQlResourceStackTemplate,
  mockSqlDataSourceStrategy,
  Template,
  testTransform,
} from '@aws-amplify/graphql-transformer-test-utils';
import { Construct } from 'constructs';
import { IndexTransformer, PrimaryKeyTransformer } from '..';
import * as resolverUtils from '../resolvers/resolvers';

test('throws if index name is invalid', () => {
  const schema = `
    type Test @model {
      id: ID! @index(name: "Canary/$")
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow(
    'The indexName is invalid. It should be between 3 and 255 characters. Only A–Z, a–z, 0–9, underscore characters, hyphens, and periods allowed.',
  );
});

test('throws if @index is used in a non-@model type', () => {
  const schema = `
    type Test {
      id: ID! @index(name: "index1")
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new IndexTransformer()],
    }),
  ).toThrow('The @index directive may only be added to object definitions annotated with @model.');
});

test('throws if the same index name is defined multiple times on an object', () => {
  const schema = `
    type Test @model {
      id: ID! @index(name: "index1")
      email: String! @index(name: "index1")
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("You may only supply one @index with the name 'index1' on type 'Test'.");
});

test('throws if an invalid LSI is created', () => {
  const schema = `
    type Test @model {
      id: ID! @primaryKey @index(name: "index1")
    }`;

  const schemaEmptySortKeyFields = `
  type Test @model {
    id: ID! @primaryKey(sortKeyFields: []) @index(name: "index1")
    foo: ID!
  }`;

  const sortKeyFieldsError =
    "Invalid @index 'index1'. You may not create an index where the partition key is the same as that of the primary key unless the primary key has a sort field. You cannot have a local secondary index without a sort key in the primary key.";

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new PrimaryKeyTransformer()],
    }),
  ).toThrow(sortKeyFieldsError);

  expect(() =>
    testTransform({
      schema: schemaEmptySortKeyFields,
      transformers: [new ModelTransformer(), new IndexTransformer(), new PrimaryKeyTransformer()],
    }),
  ).toThrow(sortKeyFieldsError);
});

test('throws if an LSI is missing sort fields', () => {
  const schema = `
    type Test @model {
      id: ID! @primaryKey(sortKeyFields: ["foo"]) @index(name: "index1")
      foo: ID!
    }`;

  const schemaInverted = `
    type Test @model {
      id: ID! @index(name: "index1") @primaryKey(sortKeyFields: ["foo"])
      foo: ID!
    }`;

  const schemaEmptySortKeyFields = `
    type Test @model {
      id: ID! @primaryKey(sortKeyFields: ["foo"]) @index(name: "index1", sortKeyFields: [])
      foo: ID!
    }`;

  const sortKeyFieldsError =
    "Invalid @index 'index1'. You may not create an index where the partition key is the same as that of the primary key unless the index has a sort field. You cannot have a local secondary index without a sort key in the index.";

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
      transformParameters: {
        secondaryKeyAsGSI: false,
      },
    }),
  ).toThrow(sortKeyFieldsError);

  expect(() =>
    testTransform({
      schema: schemaInverted,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
      transformParameters: {
        secondaryKeyAsGSI: false,
      },
    }),
  ).toThrow(sortKeyFieldsError);

  expect(() =>
    testTransform({
      schema: schemaEmptySortKeyFields,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
      transformParameters: {
        secondaryKeyAsGSI: false,
      },
    }),
  ).toThrow(sortKeyFieldsError);
});

test('throws if @index is used on a non-scalar field', () => {
  const schema = `
    type NonScalar {
      id: ID!
    }

    type Test @model {
      id: NonScalar! @index(name: "wontwork")
      email: String
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("Index 'wontwork' on type 'Test.id' cannot be a non-scalar.");
});

test('throws if @index uses a sort key field that does not exist', () => {
  const schema = `
    type Test @model {
      id: ID! @index(name: "wontwork", sortKeyFields: ["doesnotexist"])
      email: String
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("Can't find field 'doesnotexist' in Test, but it was specified in index 'wontwork'.");
});

test('throws if @index uses a sort key field that is a non-scalar', () => {
  const schema = `
    type NonScalar {
      id: ID!
    }

    type Test @model {
      id: ID! @index(name: "wontwork", sortKeyFields: ["email"])
      email: NonScalar
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("The sort key of index 'wontwork' on type 'Test.email' cannot be a non-scalar.");
});

test('throws if @index refers to itself', () => {
  const schema = `
    type Test @model {
      id: ID! @index(name: "wontwork", sortKeyFields: ["id"])
      email: String
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("@index field 'id' cannot reference itself.");
});

test('throws if @index is specified on a list', () => {
  const schema = `
    type Test @model {
      strings: [String]! @index(name: "GSI")
      email: String
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("Index 'GSI' on type 'Test.strings' cannot be a non-scalar.");
});

test('throws if @index sort key fields are a list', () => {
  const schema = `
    type Test @model {
      id: ID! @index(name: "GSI", sortKeyFields: ["strings"])
      strings: [String]!
      email: String
    }`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
    }),
  ).toThrow("The sort key of index 'GSI' on type 'Test.strings' cannot be a non-scalar.");
});

test('@index with multiple sort keys adds a query field and GSI correctly', () => {
  const inputSchema = `
    type Test @model {
      email: String! @index(name: "GSI", sortKeyFields: ["kind", "date"], queryField: "listByEmailKindDate")
      kind: Int!
      date: AWSDateTime!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);
  const stack = out.stacks.Test;

  validateModelSchema(schema);
  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'kind#date', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' },
          { AttributeName: 'kind#date', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          'Fn::If': [
            'ShouldUsePayPerRequestBilling',
            { Ref: 'AWS::NoValue' },
            {
              ReadCapacityUnits: { Ref: 'DynamoDBModelTableReadIOPS' },
              WriteCapacityUnits: { Ref: 'DynamoDBModelTableWriteIOPS' },
            },
          ],
        },
      },
    ],
  });

  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::AppSync::Resolver', {
    FieldName: 'listByEmailKindDate',
    TypeName: 'Query',
  });

  expect(out.resolvers).toMatchSnapshot();

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  expect(queryType).toBeDefined();

  const getTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'getTest');
  expect(getTestField).toBeDefined();
  expect(getTestField.arguments).toHaveLength(1);
  expect(getTestField.arguments[0].name.value).toEqual('id');

  const listTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'listTests');
  expect(listTestField).toBeDefined();
  expect(listTestField.arguments).toHaveLength(3);
  expect(listTestField.arguments[0].name.value).toEqual('filter');
  expect(listTestField.arguments[1].name.value).toEqual('limit');
  expect(listTestField.arguments[2].name.value).toEqual('nextToken');

  const queryField = queryType.fields.find((f: any) => f.name && f.name.value === 'listByEmailKindDate');
  expect(queryField).toBeDefined();
  expect(queryField.arguments).toHaveLength(6);
  expect(queryField.arguments[0].name.value).toEqual('email');
  expect(queryField.arguments[0].type.kind).toEqual('NonNullType');
  expect(queryField.arguments[0].type.type.name.value).toEqual('String');
  expect(queryField.arguments[1].name.value).toEqual('kindDate');
  expect(queryField.arguments[2].name.value).toEqual('sortDirection');
  expect(queryField.arguments[2].type.name.value).toEqual('ModelSortDirection');
  expect(queryField.arguments[3].name.value).toEqual('filter');
  expect(queryField.arguments[3].type.name.value).toEqual('ModelTestFilterInput');
  expect(queryField.arguments[4].name.value).toEqual('limit');
  expect(queryField.arguments[4].type.name.value).toEqual('Int');
  expect(queryField.arguments[5].name.value).toEqual('nextToken');
  expect(queryField.arguments[5].type.name.value).toEqual('String');
});

test('@index with a single sort key adds a query field and GSI correctly', () => {
  const inputSchema = `
    type Test @model {
      email: String!
      createdAt: AWSDateTime!
      category: String! @index(name: "CategoryGSI", sortKeyFields: ["createdAt"], queryField: "testsByCategory")
      description: String
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);
  const stack = out.stacks.Test;

  validateModelSchema(schema);
  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CategoryGSI',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
      },
    ],
  });

  expect(out.resolvers).toMatchSnapshot();

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  expect(queryType).toBeDefined();

  const getTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'getTest');
  expect(getTestField).toBeDefined();
  expect(getTestField.arguments).toHaveLength(1);
  expect(getTestField.arguments[0].name.value).toEqual('id');

  const listTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'listTests');
  expect(listTestField).toBeDefined();
  expect(listTestField.arguments).toHaveLength(3);
  expect(listTestField.arguments[0].name.value).toEqual('filter');
  expect(listTestField.arguments[1].name.value).toEqual('limit');
  expect(listTestField.arguments[2].name.value).toEqual('nextToken');

  const queryField = queryType.fields.find((f: any) => f.name && f.name.value === 'testsByCategory');
  expect(queryField).toBeDefined();
  expect(queryField.arguments).toHaveLength(6);
  expect(queryField.arguments[0].name.value).toEqual('category');
  expect(queryField.arguments[1].name.value).toEqual('createdAt');
  expect(queryField.arguments[2].name.value).toEqual('sortDirection');
  expect(queryField.arguments[2].type.name.value).toEqual('ModelSortDirection');
  expect(queryField.arguments[3].name.value).toEqual('filter');
  expect(queryField.arguments[3].type.name.value).toEqual('ModelTestFilterInput');
  expect(queryField.arguments[4].name.value).toEqual('limit');
  expect(queryField.arguments[4].type.name.value).toEqual('Int');
  expect(queryField.arguments[5].name.value).toEqual('nextToken');
  expect(queryField.arguments[5].type.name.value).toEqual('String');
});

test('@index with no sort key field adds a query field and GSI correctly', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String! @index(name: "GSI_Email", queryField: "testsByEmail")
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);
  const stack = out.stacks.Test;

  validateModelSchema(schema);
  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI_Email',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
      },
    ],
  });

  expect(out.resolvers).toMatchSnapshot();

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  expect(queryType).toBeDefined();

  const getTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'getTest');
  expect(getTestField).toBeDefined();
  expect(getTestField.arguments).toHaveLength(1);
  expect(getTestField.arguments[0].name.value).toEqual('id');

  const listTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'listTests');
  expect(listTestField).toBeDefined();
  expect(listTestField.arguments).toHaveLength(3);
  expect(listTestField.arguments[0].name.value).toEqual('filter');
  expect(listTestField.arguments[1].name.value).toEqual('limit');
  expect(listTestField.arguments[2].name.value).toEqual('nextToken');

  const queryField = queryType.fields.find((f: any) => f.name && f.name.value === 'testsByEmail');
  expect(queryField).toBeDefined();
  expect(queryField.arguments).toHaveLength(5);
  expect(queryField.arguments[0].name.value).toEqual('email');
  expect(queryField.arguments[1].name.value).toEqual('sortDirection');
  expect(queryField.arguments[1].type.name.value).toEqual('ModelSortDirection');
  expect(queryField.arguments[2].name.value).toEqual('filter');
  expect(queryField.arguments[2].type.name.value).toEqual('ModelTestFilterInput');
  expect(queryField.arguments[3].name.value).toEqual('limit');
  expect(queryField.arguments[3].type.name.value).toEqual('Int');
  expect(queryField.arguments[4].name.value).toEqual('nextToken');
  expect(queryField.arguments[4].type.name.value).toEqual('String');
});

test('@index with no queryField does not generate a query field', () => {
  const inputSchema = `
    type Test @model {
      id: ID!
      email: String! @index(name: "GSI_Email")
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
    transformParameters: {
      enableAutoIndexQueryNames: false,
    },
  });
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  expect(queryType).toBeDefined();

  const queryField = queryType.fields.find((f: any) => f.name && f.name.value === 'testsByEmail');
  expect(queryField).toBeUndefined();
});

test('creates a primary key and a secondary index', () => {
  const inputSchema = `
    type Test @model {
      email: String! @primaryKey(sortKeyFields: ["createdAt"])
      createdAt: AWSDateTime!
      category: String! @index(name: "CategoryGSI", sortKeyFields: ["createdAt"], queryField: "testsByCategory")
      description: String
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);
  const stack = out.stacks.Test;

  validateModelSchema(schema);
  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      { AttributeName: 'email', KeyType: 'HASH' },
      { AttributeName: 'createdAt', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CategoryGSI',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
      },
    ],
  });

  expect(out.resolvers).toMatchSnapshot();

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  expect(queryType).toBeDefined();

  const getTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'getTest');
  expect(getTestField).toBeDefined();
  expect(getTestField.arguments).toHaveLength(2);
  expect(getTestField.arguments[0].name.value).toEqual('email');
  expect(getTestField.arguments[1].name.value).toEqual('createdAt');

  const listTestField = queryType.fields.find((f: any) => f.name && f.name.value === 'listTests');
  expect(listTestField).toBeDefined();
  expect(listTestField.arguments).toHaveLength(6);
  expect(listTestField.arguments[0].name.value).toEqual('email');
  expect(listTestField.arguments[1].name.value).toEqual('createdAt');
  expect(listTestField.arguments[2].name.value).toEqual('filter');
  expect(listTestField.arguments[3].name.value).toEqual('limit');
  expect(listTestField.arguments[4].name.value).toEqual('nextToken');
  expect(listTestField.arguments[5].name.value).toEqual('sortDirection');

  const queryField = queryType.fields.find((f: any) => f.name && f.name.value === 'testsByCategory');
  expect(queryField).toBeDefined();
  expect(queryField.arguments).toHaveLength(6);
  expect(queryField.arguments[0].name.value).toEqual('category');
  expect(queryField.arguments[1].name.value).toEqual('createdAt');
  expect(queryField.arguments[2].name.value).toEqual('sortDirection');
  expect(queryField.arguments[2].type.name.value).toEqual('ModelSortDirection');
  expect(queryField.arguments[3].name.value).toEqual('filter');
  expect(queryField.arguments[3].type.name.value).toEqual('ModelTestFilterInput');
  expect(queryField.arguments[4].name.value).toEqual('limit');
  expect(queryField.arguments[4].type.name.value).toEqual('Int');
  expect(queryField.arguments[5].name.value).toEqual('nextToken');
  expect(queryField.arguments[5].type.name.value).toEqual('String');
});

test('connection type is generated for custom query when queries is set to null', () => {
  const inputSchema = `
    type ContentCategory @model(queries: null, mutations: { create: "addContentToCategory", delete: "deleteContentFromCategory" })
    {
      id: ID!
      category: Int! @index(name: "ContentByCategory", sortKeyFields: ["type", "language", "datetime"], queryField: "listContentByCategory")
      datetime: String!
      type: String!
      language: String!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const modelContentCategoryConnection = schema.definitions.find(
    (def: any) => def.name && def.name.value === 'ModelContentCategoryConnection',
  );

  expect(modelContentCategoryConnection).toBeDefined();
});

test('does not remove default primary key when primary key is not overidden', () => {
  const inputSchema = `
    type Blog @model {
      blogId: ID! @index(name: "btBlogIdAndCreatedAt", sortKeyFields: ["createdAt"])
      title: String!
      createdAt: AWSDateTime!
    }
  `;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const createBlogInput = schema.definitions.find(
    (d: any) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreateBlogInput',
  ) as any;
  expect(createBlogInput).toBeDefined();
  const defaultIdField = createBlogInput.fields.find((f: any) => f.name.value === 'id');
  expect(defaultIdField).toBeDefined();
});

test('sort direction and filter input are generated if default list query does not exist', () => {
  const inputSchema = `
    type Todo @model(queries: { get: "getTodo" }) {
      id: ID!
      description: String
      createdAt: AWSDateTime @index(name: "byCreatedAt", queryField: "byCreatedAt")
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const sortDirection = schema.definitions.find((d: any) => d.kind === 'EnumTypeDefinition' && d.name.value === 'ModelSortDirection');
  expect(sortDirection).toBeDefined();
  const todoInputType = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelTodoFilterInput');
  expect(todoInputType).toBeDefined();
});

test('@index adds an LSI with secondaryKeyAsGSI FF set to false', () => {
  const inputSchema = `
    type Test @model {
      email: String! @primaryKey(sortKeyFields: ["createdAt"]) @index(name: "LSI_Email_UpdatedAt", sortKeyFields: ["updatedAt"], queryField: "testsByEmailByUpdatedAt")
      createdAt: AWSDateTime!
      updatedAt: AWSDateTime!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
    transformParameters: {
      secondaryKeyAsGSI: false,
    },
  });
  const schema = parse(out.schema);
  const stack = out.stacks.Test;

  validateModelSchema(schema);
  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      { AttributeName: 'email', KeyType: 'HASH' },
      { AttributeName: 'createdAt', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
      { AttributeName: 'updatedAt', AttributeType: 'S' },
    ],
    LocalSecondaryIndexes: [
      {
        IndexName: 'LSI_Email_UpdatedAt',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' },
          { AttributeName: 'updatedAt', KeyType: 'RANGE' },
        ],
      },
    ],
  });

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  const queryIndexField = queryType.fields.find((f: any) => f.name && f.name.value === 'testsByEmailByUpdatedAt');
  expect(queryIndexField.arguments).toHaveLength(6);

  const listTestsField = queryType.fields.find((f: any) => f.name && f.name.value === 'listTests');
  expect(listTestsField.arguments).toHaveLength(6);
});

test('@index adds a GSI with secondaryKeyAsGSI FF set to true', () => {
  const inputSchema = `
    type Test @model {
      email: String! @primaryKey(sortKeyFields: ["createdAt"]) @index(name: "GSI_Email_UpdatedAt", sortKeyFields: ["updatedAt"], queryField: "testsByEmailByUpdatedAt")
      createdAt: AWSDateTime!
      updatedAt: AWSDateTime!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  const schema = parse(out.schema);
  const stack = out.stacks.Test;

  validateModelSchema(schema);
  AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      { AttributeName: 'email', KeyType: 'HASH' },
      { AttributeName: 'createdAt', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
      { AttributeName: 'updatedAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI_Email_UpdatedAt',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' },
          { AttributeName: 'updatedAt', KeyType: 'RANGE' },
        ],
      },
    ],
  });

  const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
  const queryIndexField = queryType.fields.find((f: any) => f.name && f.name.value === 'testsByEmailByUpdatedAt');
  expect(queryIndexField.arguments).toHaveLength(6);

  const listTestsField = queryType.fields.find((f: any) => f.name && f.name.value === 'listTests');
  expect(listTestsField.arguments).toHaveLength(6);
});

test('validate resolver code', () => {
  const inputSchema = `
    type Item @model {
      orderId: ID! @primaryKey(sortKeyFields: ["status", "createdAt"])
      status: Status! @index(name: "ByStatus", sortKeyFields: ["createdAt"], queryField: "itemsByStatus")
      createdAt: AWSDateTime! @index(name: "ByCreatedAt", sortKeyFields: ["status"], queryField: "itemsByCreatedAt")
      name: String!
    }
    enum Status {
      DELIVERED IN_TRANSIT PENDING UNKNOWN
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.resolvers).toMatchSnapshot();
  validateModelSchema(parse(out.schema));
});

it('@model mutation with user defined null args', () => {
  const inputSchema = `
    type Call @model(queries: null, mutations: null) {
      senderId: ID! @index(name: "bySender", sortKeyFields: ["receiverId"])
      receiverId: ID! @primaryKey(sortKeyFields: ["senderId"])
    }

    type Mutation {
      createCall(input: CreateCallInput!): Call
      deleteCall(input: DeleteCallInput!): Call
    }

    input CreateCallInput {
      receiverId: ID!
    }

    input DeleteCallInput {
      receiverId: ID!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  expect(out).toBeDefined();
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const DeleteCallInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'DeleteCallInput',
  ) as any;
  expect(DeleteCallInput).toBeDefined();
  const receiverIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'receiverId');
  expect(receiverIdField).toBeDefined();
  expect(receiverIdField.type.kind).toBe('NonNullType');

  const senderIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'senderId');
  expect(senderIdField).toBeUndefined();
});

it('@model mutation with user defined create args', () => {
  const inputSchema = `
    type Call @model(queries: null, mutations: { delete: "testDelete" }) {
      senderId: ID! @index(name: "bySender", sortKeyFields: ["receiverId"])
      receiverId: ID! @primaryKey(sortKeyFields: ["senderId"])
    }

    input CreateCallInput {
      receiverId: ID!
    }

    input DeleteCallInput {
      receiverId: ID!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  expect(out).toBeDefined();
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const DeleteCallInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'DeleteCallInput',
  ) as any;
  expect(DeleteCallInput).toBeDefined();
  const receiverIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'receiverId');
  expect(receiverIdField).toBeDefined();
  expect(receiverIdField.type.kind).toBe('NonNullType');
  const senderIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'senderId');
  expect(senderIdField).toBeDefined();
  expect(senderIdField.type.kind).toBe('NonNullType');
});

it('@model mutation with default', () => {
  const inputSchema = `
    type Call @model {
      senderId: ID! @index(name: "bySender", sortKeyFields: ["receiverId"])
      receiverId: ID! @primaryKey(sortKeyFields: ["senderId"])
    }

    input CreateCallInput {
      receiverId: ID!
    }

    input DeleteCallInput {
      receiverId: ID!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const DeleteCallInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'DeleteCallInput',
  ) as any;
  expect(DeleteCallInput).toBeDefined();
  const receiverIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'receiverId');
  expect(receiverIdField).toBeDefined();
  expect(receiverIdField.type.kind).toBe('NonNullType');
  const senderIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'senderId');
  expect(senderIdField).toBeDefined();
  expect(senderIdField.type.kind).toBe('NonNullType');

  const CreateCallInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreateCallInput',
  ) as any;
  expect(CreateCallInput).toBeDefined();
  const receiverIdFieldCreate = CreateCallInput.fields.find((f: any) => f.name.value === 'receiverId');
  expect(receiverIdFieldCreate).toBeDefined();
  expect(receiverIdFieldCreate.type.kind).toBe('NonNullType');
  const senderIdFieldCreate = CreateCallInput.fields.find((f: any) => f.name.value === 'senderId');
  expect(senderIdFieldCreate).toBeUndefined();
});

it('@model mutation with queries', () => {
  const inputSchema = `
    type Call @model(queries: null) {
      senderId: ID! @index(name: "bySender", sortKeyFields: ["receiverId"])
      receiverId: ID! @primaryKey(sortKeyFields: ["senderId"])
    }

    input CreateCallInput {
      receiverId: ID!
    }

    input DeleteCallInput {
      receiverId: ID!
    }`;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const DeleteCallInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'DeleteCallInput',
  ) as any;
  expect(DeleteCallInput).toBeDefined();
  const receiverIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'receiverId');
  expect(receiverIdField).toBeDefined();
  expect(receiverIdField.type.kind).toBe('NonNullType');
  const senderIdField = DeleteCallInput.fields.find((f: any) => f.name.value === 'senderId');
  expect(senderIdField).toBeDefined();
  expect(senderIdField.type.kind).toBe('NonNullType');

  const CreateCallInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreateCallInput',
  ) as any;
  expect(CreateCallInput).toBeDefined();
  const receiverIdFieldCreate = CreateCallInput.fields.find((f: any) => f.name.value === 'receiverId');
  expect(receiverIdFieldCreate).toBeDefined();
  expect(receiverIdFieldCreate.type.kind).toBe('NonNullType');
  const senderIdFieldCreate = CreateCallInput.fields.find((f: any) => f.name.value === 'senderId');
  expect(senderIdFieldCreate).toBeUndefined();
});

it('id field should be optional in updateInputObjects when it is not a primary key', () => {
  const inputSchema = /* GraphQL */ `
    type Review @model(subscriptions: { level: off }) {
      id: ID! @index(name: "byId", queryField: "listReviewsById")
      serviceId: ID! @index(name: "byService", sortKeyFields: ["createdAt"], queryField: "listReviewsByService")
      owner: String!
        @primaryKey(sortKeyFields: ["serviceId"])
        @index(name: "byStatus", sortKeyFields: ["status", "createdAt"], queryField: "listReviewsByStatus")
      rating: Int
      title: String
      status: String
      createdAt: AWSDateTime!
    }
  `;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);

  validateModelSchema(schema);

  const UpdateReviewInput = schema.definitions.find(
    (d) => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'UpdateReviewInput',
  ) as any;
  expect(UpdateReviewInput).toBeDefined();
  const idField = UpdateReviewInput.fields.find((f: any) => f.name.value === 'id');
  expect(idField).toBeDefined();
  expect(idField.type.kind).toBe('NamedType');
});

test('GSI composite sort keys are wrapped in conditional to check presence in mutation', () => {
  const inputSchema = `
    type Person @model {
      id: ID! @primaryKey(sortKeyFields: ["firstName", "lastName"])
      firstName: String! @index(name: "byNameAndAge", sortKeyFields: ["age", "birthDate"], queryField: "getPersonByNameByDate")
                         @index(name: "byNameAndNickname", sortKeyFields: ["lastName", "nickname"])
      lastName: String!
      birthDate: AWSDate
      nickname: String
      age: Int
    }
  `;
  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);

  validateModelSchema(schema);
  expect(out.resolvers['Mutation.createPerson.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updatePerson.req.vtl']).toMatchSnapshot();
});

it('should support index/primary key with sync resolvers', () => {
  const validSchema = `
    type Item @model {
      orderId: ID! @primaryKey(sortKeyFields: ["status", "createdAt"])
      status: Status! @index(name: "ByStatus", sortKeyFields: ["createdAt"], queryField: "itemsByStatus")
      createdAt: AWSDateTime! @index(name: "ByCreatedAt", sortKeyFields: ["status"], queryField: "itemsByCreatedAt")
      name: String!
    }
    enum Status {
      DELIVERED IN_TRANSIT PENDING UNKNOWN
    }
  `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
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

it('sync query resolver renders without overrides', () => {
  const validSchema = `
    type Song @model {
      id: ID!
      name: String!
      genre: String! @index(name : "byGenre", queryField: "songInfoByGenre")
    }
  `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
    resolverConfig: {
      project: {
        ConflictDetection: 'VERSION',
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
      },
    },
  });

  expect(out).toBeDefined();

  const expectedSyncDeltaSyncTtlConfig = '#set( $minLastSync = $util.time.nowEpochMilliSeconds() - 1800000 )';
  expect(out?.resolvers['Query.syncSongs.preAuth.1.req.vtl']?.includes(expectedSyncDeltaSyncTtlConfig));
  const definition = out.schema;
  expect(definition).toBeDefined();
  expect(out.resolvers).toMatchSnapshot();

  validateModelSchema(parse(definition));
});

it('sync query resolver renders with deltaSyncTableTTL override', () => {
  const validSchema = `
    type Song @model {
      id: ID!
      name: String!
      genre: String! @index(name : "byGenre", queryField: "songInfoByGenre")
    }
  `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new IndexTransformer(), new PrimaryKeyTransformer()],
    resolverConfig: {
      project: {
        ConflictDetection: 'VERSION',
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
      },
    },
    overrideConfig: {
      overrideFlag: true,
      applyOverride: (_: Construct) =>
        ({
          models: {
            Song: {
              modelDatasource: {
                dynamoDbConfig: {
                  deltaSyncConfig: {
                    deltaSyncTableTtl: 15,
                  },
                },
              },
            },
          },
        } as unknown as AmplifyApiGraphQlResourceStackTemplate),
    },
  });

  expect(out).toBeDefined();

  const expectedSyncDeltaSyncTtlConfig = '#set( $minLastSync = $util.time.nowEpochMilliSeconds() - 900000 )';
  expect(out?.resolvers['Query.syncSongs.preAuth.1.req.vtl']?.includes(expectedSyncDeltaSyncTtlConfig));
  const definition = out.schema;
  expect(definition).toBeDefined();
  expect(out.resolvers).toMatchSnapshot();

  validateModelSchema(parse(definition));
});

test('LSI creation regression test', () => {
  const inputSchema = `
    type Test @model {
      id: ID! @primaryKey
      index: ID! @index(name: "index1", sortKeyFields: ["id"])
    }`;

  const out = testTransform({
    schema: inputSchema,
    transformers: [new ModelTransformer(), new IndexTransformer(), new PrimaryKeyTransformer()],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('it throws an understandable error on boolean sort keys', () => {
  const inputSchema = `
  type Test @model {
    taskID: ID! @index(sortKeyFields: ["completed"])
    completed: Boolean!
  }`;

  expect(() =>
    testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer(), new PrimaryKeyTransformer()],
    }),
  ).toThrowErrorMatchingInlineSnapshot('"Sort Key Condition could not be constructed for field \'completed\'"');
});

describe('automatic name generation', () => {
  const transform = (
    enableAutoIndexQueryNames: boolean,
    modelName: string,
    inputSchema: string,
  ): { schema: DocumentNode; stack: Template } => {
    const transformerOutput = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
      transformParameters: {
        enableAutoIndexQueryNames,
      },
    });
    const schema = parse(transformerOutput.schema);
    validateModelSchema(schema);
    return { schema, stack: transformerOutput.stacks[modelName] };
  };
  const expectGSILike = ({
    stack,
    indexName,
    hashKeyName,
    sortKeyName,
  }: {
    stack: Template;
    indexName: string;
    hashKeyName: string;
    sortKeyName?: string;
  }): void => {
    const keySchema = [{ AttributeName: hashKeyName, KeyType: 'HASH' }];
    if (sortKeyName) {
      keySchema.push({ AttributeName: sortKeyName, KeyType: 'RANGE' });
    }
    AssertionTemplate.fromJSON(stack).hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        {
          IndexName: indexName,
          KeySchema: keySchema,
        },
      ],
    });
  };
  const expectGeneratedQueryLike = ({
    schema,
    queryFieldName,
    hashKeyFieldName,
    sortKeyFieldName,
  }: {
    schema: DocumentNode;
    queryFieldName: string;
    hashKeyFieldName: string;
    sortKeyFieldName?: string;
  }): void => {
    const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
    expect(queryType).toBeDefined();
    const queryField = queryType.fields.find((f: any) => f.name && f.name.value === queryFieldName);
    expect(queryField).toBeDefined();
    expect(queryField.arguments[0].name.value).toEqual(hashKeyFieldName);
    if (sortKeyFieldName) {
      expect(queryField.arguments[1].name.value).toEqual(sortKeyFieldName);
    }
  };

  it('generates an index name and queryField if neither is provided', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index
      }
    `,
    );
    expectGSILike({ stack, indexName: 'testsByCategory', hashKeyName: 'category' });
    expectGeneratedQueryLike({ schema, queryFieldName: 'testsByCategory', hashKeyFieldName: 'category' });
  });

  it('generates an index name and queryField if neither are provided with sort key field', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index(sortKeyFields: ["priority"])
        priority: String!
      }
    `,
    );
    expectGSILike({
      stack,
      indexName: 'testsByCategoryAndPriority',
      hashKeyName: 'category',
      sortKeyName: 'priority',
    });
    expectGeneratedQueryLike({
      schema,
      queryFieldName: 'testsByCategoryAndPriority',
      hashKeyFieldName: 'category',
      sortKeyFieldName: 'priority',
    });
  });

  it('generates an index name and queryField if neither are provided with multiple sort key fields', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index(sortKeyFields: ["priority", "severity"])
        priority: String!
        severity: String!
      }
    `,
    );
    expectGSILike({
      stack,
      indexName: 'testsByCategoryAndPriorityAndSeverity',
      hashKeyName: 'category',
      sortKeyName: 'priority#severity',
    });
    expectGeneratedQueryLike({
      schema,
      queryFieldName: 'testsByCategoryAndPriorityAndSeverity',
      hashKeyFieldName: 'category',
      sortKeyFieldName: 'prioritySeverity',
    });
  });

  it('generates an queryField if none is provided', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index(name: "overrideByCategory")
      }
    `,
    );
    expectGSILike({ stack, indexName: 'overrideByCategory', hashKeyName: 'category' });
    expectGeneratedQueryLike({ schema, queryFieldName: 'testsByCategory', hashKeyFieldName: 'category' });
  });

  it('generates an queryField if none is provided with sort key field', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index(name: "overrideByCategory", sortKeyFields: ["priority"])
        priority: String!
      }
    `,
    );
    expectGSILike({
      stack,
      indexName: 'overrideByCategory',
      hashKeyName: 'category',
      sortKeyName: 'priority',
    });
    expectGeneratedQueryLike({
      schema,
      queryFieldName: 'testsByCategoryAndPriority',
      hashKeyFieldName: 'category',
      sortKeyFieldName: 'priority',
    });
  });

  it('generates an queryField if none is provided with multiple sort key fields', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index(name: "overrideByCategory", sortKeyFields: ["priority", "severity"])
        priority: String!
        severity: String!
      }
    `,
    );
    expectGSILike({
      stack,
      indexName: 'overrideByCategory',
      hashKeyName: 'category',
      sortKeyName: 'priority#severity',
    });
    expectGeneratedQueryLike({
      schema,
      queryFieldName: 'testsByCategoryAndPriorityAndSeverity',
      hashKeyFieldName: 'category',
      sortKeyFieldName: 'prioritySeverity',
    });
  });

  it('does not generates a queryField if a null is provided', () => {
    const { schema, stack } = transform(
      true,
      'Test',
      `
      type Test @model {
        category: String! @index(queryField: null)
      }
    `,
    );
    expectGSILike({ stack, indexName: 'testsByCategory', hashKeyName: 'category' });
    const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
    expect(queryType).toBeDefined();
    expect(queryType.fields.some((f: any) => f.name && f.name.value === 'testsByCategory')).toBeFalsy();
  });

  it('does not generate a queryField if no input is provided, and feature flag is disabled', () => {
    const { schema, stack } = transform(
      false,
      'Test',
      `
      type Test @model {
        category: String! @index
      }
    `,
    );
    expectGSILike({ stack, indexName: 'testsByCategory', hashKeyName: 'category' });
    const queryType = schema.definitions.find((def: any) => def.name && def.name.value === 'Query') as any;
    expect(queryType).toBeDefined();
    expect(queryType.fields.some((f: any) => f.name && f.name.value === 'testsByCategory')).toBeFalsy();
  });

  it('throws on explicit null name regardless of feature flag state', () => {
    const modelName = 'Test';
    const schema = `
      type Test @model {
        category: String! @index(name: null)
      }
    `;
    const errorMessage = 'Explicit null value not allowed for name field on @index';
    expect(() => transform(true, modelName, schema)).toThrow(errorMessage);
    expect(() => transform(false, modelName, schema)).toThrow(errorMessage);
  });
});

describe('Index query resolver creation', () => {
  const schema = /* GrahphQL */ `
      type Test @model {
        category: String! @index(name: null)
      }
    `;

  const mysqlStrategy = mockSqlDataSourceStrategy();

  const dataSourceStrategies = constructDataSourceStrategies(schema, mysqlStrategy);

  const modelName = 'Test';
  const mockResolver = {
    addToSlot: jest.fn(),
    setScope: jest.fn(),
  };
  const mockModelFieldMap = {
    getMappedFields: jest.fn(),
    addResolverReference: jest.fn(),
  };
  const mockConfig = {
    name: 'byUsername',
    object: { name: { value: modelName } },
    queryField: 'queryByUsername',
  };
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = constructMockContext();
  });

  it('sets appropriate resolver reference if field mappings are present for a RDS model', () => {
    mockContext.dataSourceStrategies = dataSourceStrategies;
    mockContext.api.host.getDataSource.mockReturnValue({});
    mockModelFieldMap.getMappedFields.mockReturnValue([{ details: 'description' }]);
    resolverUtils.makeQueryResolver(mockConfig as any, mockContext as any, MYSQL_DB_TYPE);

    expect(mockContext.resolvers.addResolver).toBeCalledWith('Query', 'queryByUsername', mockResolver);
    expect(mockModelFieldMap.addResolverReference).toBeCalledWith({
      typeName: 'Query',
      fieldName: 'queryByUsername',
      isList: false,
    });
  });

  it('does not set resolver reference if field mappings are not present for a RDS model', () => {
    mockContext.dataSourceStrategies = dataSourceStrategies;
    mockContext.api.host.getDataSource.mockReturnValue({});
    mockModelFieldMap.getMappedFields.mockReturnValue([]);
    resolverUtils.makeQueryResolver(mockConfig as any, mockContext as any, MYSQL_DB_TYPE);

    expect(mockContext.resolvers.addResolver).toBeCalledWith('Query', 'queryByUsername', mockResolver);
    expect(mockModelFieldMap.addResolverReference).not.toBeCalled();
  });

  it('does not set resolver reference for a DDB model', () => {
    const mockResolverUtils = jest.spyOn(resolverUtils, 'getVTLGenerator');
    mockResolverUtils.mockReturnValueOnce({
      generateIndexQueryRequestTemplate: jest.fn().mockReturnValue('mock template'),
      generatePrimaryKeyVTL: jest.fn().mockReturnValue('mock template'),
    });
    mockContext.dataSourceStrategies = {
      Test: DDB_DEFAULT_DATASOURCE_STRATEGY,
    };
    const mockTable = {
      stack: {
        node: {
          id: 'UserTable',
        },
      },
    };
    mockContext.api.host.getDataSource.mockReturnValue({});
    mockContext.dataSources.get.mockReturnValue({
      ds: { stack: { node: { findChild: jest.fn().mockReturnValue(mockTable) } } },
    });
    mockModelFieldMap.getMappedFields.mockReturnValue([{ details: 'description' }]);
    resolverUtils.makeQueryResolver(mockConfig as any, mockContext as any, DDB_DB_TYPE);

    // The resolver is added with correct type and field names
    expect(mockContext.resolvers.addResolver).toBeCalledWith('Query', 'queryByUsername', mockResolver);
    // Even if the field mapping exists, the resolver reference is not added for DDB models
    expect(mockModelFieldMap.addResolverReference).not.toBeCalled();
  });

  const constructMockContext = () => {
    return {
      api: {
        host: {
          getDataSource: jest.fn(),
        },
      },
      output: {
        getQueryTypeName: jest.fn().mockReturnValue('Query'),
      },
      resolvers: {
        generateQueryResolver: jest.fn().mockReturnValue(mockResolver),
        addResolver: jest.fn(),
      },
      resourceHelper: {
        getModelFieldMap: jest.fn().mockReturnValue(mockModelFieldMap),
        getModelNameMapping: jest.fn().mockReturnValue(modelName),
      },
      transformParameters: {
        sandboxModeEnabled: true,
      },
      stackManager: {
        getScopeFor: jest.fn(),
      },
      dataSources: {
        get: jest.fn(),
      },
      synthParameters: {},
    };
  };
});

describe('auth', () => {
  const API_KEY = 'API Key Authorization';
  const IAM_AUTH_TYPE = 'IAM Authorization';

  const schema = /* GraphQL */ `
    type Test @model {
      id: ID!
      description: String @index(name: "index1")
    }
  `;

  it('sandbox auth enabled should add apiKey if not default mode of auth', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      synthParameters: {
        enableIamAccess: false,
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
    expect(out.schema).toContain('aws_api_key');
    expect(out.schema).not.toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toContain(API_KEY);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).not.toContain(IAM_AUTH_TYPE);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toMatchSnapshot();
  });

  it('iam auth enabled should add aws_iam if not default mode of auth', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
      transformParameters: {
        sandboxModeEnabled: false,
      },
      synthParameters: {
        enableIamAccess: true,
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).not.toContain('aws_api_key');
    expect(out.schema).toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).not.toContain(API_KEY);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toContain(IAM_AUTH_TYPE);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toMatchSnapshot();
  });

  it('iam and sandbox auth enabled should add aws_iam and aws_api_key if not default mode of auth', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      synthParameters: {
        enableIamAccess: true,
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).toContain('aws_api_key');
    expect(out.schema).toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toContain(API_KEY);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toContain(IAM_AUTH_TYPE);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toMatchSnapshot();
  });

  it('iam and sandbox auth disable should not add service directives', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new IndexTransformer()],
      transformParameters: {
        sandboxModeEnabled: false,
      },
      synthParameters: {
        enableIamAccess: false,
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).not.toContain('aws_api_key');
    expect(out.schema).not.toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).not.toContain(API_KEY);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).not.toContain(IAM_AUTH_TYPE);
    expect(out.resolvers['Query.testsByDescription.postAuth.1.res.vtl']).toMatchSnapshot();
  });
});
