import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { SqlTransformer } from '../graphql-sql-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';

describe('sql directive tests', () => {
  it('should compile happy case with statement argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const out = testTransform({
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL',
            provisionDB: false,
          },
        }),
      ),
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

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const out = testTransform({
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      customQueries,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL',
            provisionDB: false,
          },
        }),
      ),
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

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax-rate', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const transformConfig = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      customQueries,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL' as const,
            provisionDB: false,
          },
        }),
      ),
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive \'reference\' argument must be a valid custom query name. Check type "Query" and field "calculateTaxRate". The custom query "calculate-tax" does not exist in "sql-statements" directory.',
    );
  });
});
