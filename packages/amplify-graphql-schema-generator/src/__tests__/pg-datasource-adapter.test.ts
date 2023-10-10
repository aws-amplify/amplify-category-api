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
    expect(adapter.mapDataType('uuid', true, 'table', 'field', 'uuid')).toEqual({
      kind: 'Scalar',
      name: 'ID',
    });
    expect(adapter.mapDataType('date', true, 'table', 'field', 'date')).toEqual({
      kind: 'Scalar',
      name: 'AWSDate',
    });
    expect(adapter.mapDataType('time', true, 'table', 'field', 'time')).toEqual({
      kind: 'Scalar',
      name: 'AWSTime',
    });
    expect(adapter.mapDataType('json', true, 'table', 'field', 'json')).toEqual({
      kind: 'Scalar',
      name: 'AWSJSON',
    });
    expect(adapter.mapDataType('datetime', true, 'table', 'field', 'datetime')).toEqual({
      kind: 'Scalar',
      name: 'AWSDateTime',
    });
    expect(adapter.mapDataType('inet', true, 'table', 'field', 'inet')).toEqual({
      kind: 'Scalar',
      name: 'AWSIPAddress',
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
