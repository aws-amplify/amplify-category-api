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
    ['char', 'varchar', 'text'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'String',
      });
    });
    ['boolean', 'bool'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'Boolean',
      });
    });
    ['bigint','int8','bigserial','bit','int','int4','int2','smallint','smallserial','serial','serial4'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'Int',
      });
    });
    ['float8','money','numeric','decimal','real','float4'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'Float',
      });
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
    ['box','circle','json','jsonb','line','lseg','path','point','polygon'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'AWSJSON',
      });
    });
    ['datetime', 'timestamp'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'AWSDateTime',
      });
    });
    ['cidr','inet'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'AWSIPAddress',
      });
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
