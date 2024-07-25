import { constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { TestTransformParameters, mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { SqlTransformer } from '../graphql-sql-transformer';

describe('sql directive tests', () => {
  const mySqlStrategy = mockSqlDataSourceStrategy();

  it('should compile happy case with statement argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const out = testTransform({
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
        },
      ],
    });
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toMatchSnapshot();
  });

  it('should compile happy case with reference argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(reference: "calculate-tax")
      }
    `;

    const out = testTransform({
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
          customSqlStatements: {
            'calculate-tax': 'SELECT * FROM TAXRATE WHERE ZIP = :zip',
          },
        },
      ],
    });
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toMatchSnapshot();
  });

  it('should throw error if incorrect reference argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(reference: "calculate-tax")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
          customSqlStatements: {
            'incorrect-reference-name': 'SELECT * FROM TAXRATE WHERE ZIP = :zip',
          },
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      'The Query field "calculateTaxRate" references a custom SQL statement "calculate-tax" that doesn\'t exist. Verify that "calculate-tax" is a key in the customSqlStatements property.',
    );
  });

  it('should throw error if both statement and argument provided', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip", reference: "calculate-tax")
      }
    `;

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
          customSqlStatements: {
            'calculate-tax': 'SELECT * FROM TAXRATE WHERE ZIP = :zip',
          },
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive can have either a \'statement\' or a \'reference\' argument but not both. Check type "Query" and field "calculateTaxRate".',
    );
  });

  it('should throw error if neither statement and argument provided', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql
      }
    `;

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
          customSqlStatements: {
            'calculate-tax': 'SELECT * FROM TAXRATE WHERE ZIP = :zip',
          },
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive must have either a \'statement\' or a \'reference\' argument. Check type "Query" and field "calculateTaxRate".',
    );
  });

  it('should throw error if statement is empty', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive \'statement\' argument must not be empty. Check type "Query" and field "calculateTaxRate".',
    );
  });

  it('throws an error if invoked with the wrong type', () => {
    const doc = /* GraphQL */ `
      type Todo {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Todo' as any,
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
        },
      ],
    };
    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive can only be used on Query or Mutation types. Check type "Todo" and field "calculateTaxRate".',
    );
  });

  it('successfully processes a schema with only custom SQL', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      dataSourceStrategies: {},
      sqlDirectiveDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          strategy: mySqlStrategy,
        },
      ],
    };

    const out = testTransform(transformConfig);
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toMatchSnapshot();
  });

  describe('Post auth resolver', () => {
    it('Renders post auth resolver if sandbox is enabled and iam access disabled', () => {
      const doc = /* GraphQL */ `
        type Query {
          calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
        }
      `;

      const out = testTransform({
        schema: doc,
        transformers: [new ModelTransformer(), new SqlTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
        transformParameters: {
          sandboxModeEnabled: true,
        },
        synthParameters: {
          enableIamAccess: false,
        },
        sqlDirectiveDataSourceStrategies: [
          {
            typeName: 'Query',
            fieldName: 'calculateTaxRate',
            strategy: mySqlStrategy,
          },
        ],
      });
      expect(out).toBeDefined();
      expect(out.resolvers).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toMatchSnapshot();
    });

    it('Renders post auth resolver if sandbox is enabled and iam access enabled', () => {
      const doc = /* GraphQL */ `
        type Query {
          calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
        }
      `;

      const out = testTransform({
        schema: doc,
        transformers: [new ModelTransformer(), new SqlTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
        transformParameters: {
          sandboxModeEnabled: true,
        },
        synthParameters: {
          enableIamAccess: true,
        },
        sqlDirectiveDataSourceStrategies: [
          {
            typeName: 'Query',
            fieldName: 'calculateTaxRate',
            strategy: mySqlStrategy,
          },
        ],
      });
      expect(out).toBeDefined();
      expect(out.resolvers).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toMatchSnapshot();
    });

    it('Renders post auth resolver if sandbox is disabled and iam access enabled', () => {
      const doc = /* GraphQL */ `
        type Query {
          calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
        }
      `;

      const out = testTransform({
        schema: doc,
        transformers: [new ModelTransformer(), new SqlTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
        transformParameters: {
          sandboxModeEnabled: false,
        },
        synthParameters: {
          enableIamAccess: true,
        },
        sqlDirectiveDataSourceStrategies: [
          {
            typeName: 'Query',
            fieldName: 'calculateTaxRate',
            strategy: mySqlStrategy,
          },
        ],
      });
      expect(out).toBeDefined();
      expect(out.resolvers).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toMatchSnapshot();
    });

    it('Renders post auth resolver if sandbox is disabled and iam access disabled', () => {
      const doc = /* GraphQL */ `
        type Query {
          calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
        }
      `;

      const out = testTransform({
        schema: doc,
        transformers: [new ModelTransformer(), new SqlTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(doc, mySqlStrategy),
        transformParameters: {
          sandboxModeEnabled: false,
        },
        synthParameters: {
          enableIamAccess: false,
        },
        sqlDirectiveDataSourceStrategies: [
          {
            typeName: 'Query',
            fieldName: 'calculateTaxRate',
            strategy: mySqlStrategy,
          },
        ],
      });
      expect(out).toBeDefined();
      expect(out.resolvers).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toBeDefined();
      expect(out.resolvers['Query.calculateTaxRate.postAuth.1.req.vtl']).toMatchSnapshot();
    });
  });
});
