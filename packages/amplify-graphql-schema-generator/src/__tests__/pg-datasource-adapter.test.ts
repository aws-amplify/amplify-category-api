import { DataSourceAdapter, PostgresDataSourceAdapter } from '../datasource-adapter';
import { Engine, Field, FieldType, Index, Model, Schema } from '../schema-representation';
import { generateGraphQLSchema, isComputeExpression } from '../schema-generator';
import { gql } from 'graphql-transformer-core';

describe('testDataSourceAdapter', () => {
  it('test postgres datatype mapping', () => {
    const config = {
      host: 'host',
      database: 'database',
      port: 1234,
      username: 'username',
      password: 'password',
    };
    const adapter = new PostgresDataSourceAdapter(config);
    expect(adapter.mapDataType('varchar', true, 'table', 'field', 'varchar')).toEqual({
      kind: 'Scalar',
      name: 'String',
    });
    expect(adapter.mapDataType('char', true, 'table', 'field', 'varchar')).toEqual({
      kind: 'Scalar',
      name: 'String',
    });
    expect(adapter.mapDataType('bool', true, 'table', 'field', 'bool')).toEqual({
      kind: 'Scalar',
      name: 'Boolean',
    });
    expect(adapter.mapDataType('decimal', true, 'table', 'field', 'decimal')).toEqual({
      kind: 'Scalar',
      name: 'Float',
    });
    expect(adapter.mapDataType('varchar', true, 'table', 'field', '_varchar')).toEqual({
      kind: 'List',
      type: {
        kind: 'Scalar',
        name: 'String',
      },
    });
    expect(adapter.mapDataType('int', false, 'table', 'field', '_int')).toEqual({
      kind: 'List',
      type: {
        kind: 'NonNull',
        type: {
          kind: 'Scalar',
          name: 'Int',
        },
      },
    });
  });
});
