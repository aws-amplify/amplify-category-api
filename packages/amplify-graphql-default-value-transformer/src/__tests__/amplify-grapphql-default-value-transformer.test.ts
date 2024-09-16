import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { constructDataSourceStrategies, getResourceNamesForStrategy, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { DefaultValueTransformer } from '..';

describe('DefaultValueModelTransformer:', () => {
  it('throws if @default is used in a non-@model type', () => {
    const schema = `
      type Test {
        id: ID!
        name: String @default(value: "hello world")
      }`;

    expect(() =>
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new DefaultValueTransformer()],
      }),
    ).toThrow('The @default directive may only be added to object definitions annotated with @model.');
  });

  it('throws if @default is used on a non scalar or enum field', () => {
    const schema = `
      type Test @model {
        id: ID!
        student: Student @default(value: "{'name':'FooBar'}")
      }

      type Student {
        name: String
      }
    `;

    expect(() =>
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new DefaultValueTransformer()],
      }),
    ).toThrow('The @default directive may only be added to scalar or enum field types.');
  });

  it.each([
    {
      type: 'String',
      value: undefined,
      expectedError: 'Directive "@default" argument "value" of type "String!" is required, but it was not provided.',
    },
    { type: 'Int', value: '"text"', expectedError: 'Default value "text" is not a valid Int.' },
    { type: 'Boolean', value: '"text"', expectedError: 'Default value "text" is not a valid Boolean.' },
    { type: 'AWSJSON', value: '"text"', expectedError: 'Default value "text" is not a valid AWSJSON.' },
    { type: 'AWSDate', value: '"text"', expectedError: 'Default value "text" is not a valid AWSDate.' },
    { type: 'AWSDateTime', value: '"text"', expectedError: 'Default value "text" is not a valid AWSDateTime.' },
    { type: 'AWSTime', value: '"text"', expectedError: 'Default value "text" is not a valid AWSTime.' },
    { type: 'AWSTimestamp', value: '"text"', expectedError: 'Default value "text" is not a valid AWSTimestamp.' },
    { type: 'AWSURL', value: '"text"', expectedError: 'Default value "text" is not a valid AWSURL.' },
    { type: 'AWSPhone', value: '"text"', expectedError: 'Default value "text" is not a valid AWSPhone.' },
    { type: 'AWSIPAddress', value: '"text"', expectedError: 'Default value "text" is not a valid AWSIPAddress.' },
  ])(`throws if @default is used with invalid type. %type check.`, ({ type, value, expectedError }) => {
    const schema = `
      type Test @model {
      id: ID!
      value: ${type} ${value !== undefined ? `@default(value: ${value})` : '@default'}
      }
    `;
    expect(() =>
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new DefaultValueTransformer()],
      }),
    ).toThrow(expectedError);
  });

  it('should validate enum values', async () => {
    const inputSchema = `
      type Post @model {
        id: ID!
        enumValue: Tag @default(value: "INVALID")
      }

      enum Tag {
        NEWS
        RANDOM
      }
    `;

    expect(() =>
      testTransform({
        schema: inputSchema,
        transformers: [new ModelTransformer(), new DefaultValueTransformer()],
      }),
    ).toThrow('Default value "INVALID" is not a member of Tag enum.');
  });

  it('should be supported on a required field.', () => {
    const inputSchema = `
      type Test @model {
        id: ID!
        stringValue: String! @default(value: "hello world")
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new DefaultValueTransformer()],
    });
    expect(out).toBeDefined();
    expect(out.schema).toMatchSnapshot();

    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  it('should successfully transform simple valid schema', async () => {
    const inputSchema = `
      type Post @model {
        id: ID!
        stringValue: String @default(value: "hello world")
        intVal: Int @default(value: "10002000")
        floatValue: Float @default(value: "123456.34565")
        booleanValue: Boolean @default(value: "true")
        awsJsonValue: AWSJSON @default(value: "{\\"a\\":1, \\"b\\":3, \\"string\\": 234}")
        awsDateValue: AWSDate @default(value: "2016-01-29")
        awsTimestampValue: AWSTimestamp @default(value: "545345345")
        awsEmailValue: AWSEmail @default(value: "local-part@domain-part")
        awsURLValue: AWSURL @default(value: "https://www.amazon.com/dp/B000NZW3KC/")
        awsPhoneValue: AWSPhone @default(value: "+41 44 668 18 00")
        awsIPAddressValue1: AWSIPAddress @default(value: "123.12.34.56")
        awsIPAddressValue2: AWSIPAddress @default(value: "1a2b:3c4b::1234:4567")
        enumValue: Tag @default(value: "RANDOM")
        awsTimeValue: AWSTime @default(value: "12:00:34Z")
        awsDateTime: AWSDateTime @default(value: "2007-04-05T14:30:34Z")
      }

      enum Tag {
        NEWS
        RANDOM
      }
    `;
    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new DefaultValueTransformer()],
    });
    expect(out).toBeDefined();
    expect(out.schema).toMatchSnapshot();

    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  it('should successfully set the default values when model name starts with lowercase', async () => {
    const inputSchema = `
      type post @model {
        id: ID!
        stringValue: String @default(value: "hello world")
      }
    `;
    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new DefaultValueTransformer()],
    });
    expect(out).toBeDefined();
    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Mutation.createPost.init.2.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.createPost.init.2.req.vtl']).toMatchSnapshot();
    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  it('default value type should not be validated for sql datasource', async () => {
    const validSchema = `
      type Note @model {
          id: ID! @primaryKey
          content: String!
          createdAt: AWSDateTime @default(value: "CURRENT_TIMESTAMP")
      }
    `;

    const mySqlStrategy = mockSqlDataSourceStrategy();
    const resourceNames = getResourceNamesForStrategy(mySqlStrategy);
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new DefaultValueTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mySqlStrategy),
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    expect(out.stacks).toBeDefined();
    expect(out.stacks[resourceNames.sqlStack]).toBeDefined();
    expect(out.stacks[resourceNames.sqlStack].Resources).toBeDefined();
    expect(out.resolvers['Mutation.createNote.init.1.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.createNote.init.2.req.vtl']).toBeUndefined();
  });
});
