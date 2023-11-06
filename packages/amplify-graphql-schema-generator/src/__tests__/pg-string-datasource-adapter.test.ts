import { StringDataSourceAdapter, PostgresStringDataSourceAdapter } from '../datasource-adapter';
import { Engine, Field, FieldType, Index, Model, Schema } from '../schema-representation';
import { generateGraphQLSchema, isComputeExpression } from '../schema-generator';
import { schemas } from './__utils__/schemas';
import { gql } from 'graphql-transformer-core';

class TestStringDataSourceAdapter extends StringDataSourceAdapter {
  public getTablesList(): string[] {
    return ['Test'];
  }

  public getFields(tableName: string): Field[] {
    return [];
  }

  public getPrimaryKey(tableName: string): Index | null {
    return null;
  }

  public getIndexes(tableName: string): Index[] {
    return [];
  }

  protected mapDataType(type: string, nullable: boolean): FieldType {
    return {
      kind: 'Scalar',
      name: 'String',
    };
  }

  protected parseSchema(schema: string): void {}

  protected setFields(fields: any[]): void {}

  protected setIndexes(indexes: any[]): void {}

  protected setTables(tables: any[]): void {}
}

describe('testPostgresStringDataSourceAdapter', () => {
  it('getModels call the default implementation', async () => {
    const adapter: StringDataSourceAdapter = new TestStringDataSourceAdapter('');
    adapter.getTablesList = jest.fn(() => ['Test']);
    adapter.getFields = jest.fn(() => []);
    adapter.getPrimaryKey = jest.fn();
    adapter.getIndexes = jest.fn(() => []);
    adapter.getModels();
    expect(adapter.getTablesList).toBeCalledTimes(1);
    expect(adapter.getFields).toBeCalledTimes(1);
    expect(adapter.getIndexes).toBeCalledTimes(1);
    expect(adapter.getPrimaryKey).toBeCalledTimes(1);
  });

  it('test postgres datatype mapping', () => {
    const schema = '';
    const adapter = new PostgresStringDataSourceAdapter(schema);
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
    ['bigint', 'int8', 'bigserial', 'bit', 'int', 'int4', 'int2', 'smallint', 'smallserial', 'serial', 'serial4'].forEach((type) => {
      expect(adapter.mapDataType(type, true, 'table', 'field', type)).toEqual({
        kind: 'Scalar',
        name: 'Int',
      });
    });
    ['float8', 'money', 'numeric', 'decimal', 'real', 'float4'].forEach((type) => {
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
    ['box', 'circle', 'json', 'jsonb', 'line', 'lseg', 'path', 'point', 'polygon'].forEach((type) => {
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
    ['cidr', 'inet'].forEach((type) => {
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

  it('sets the correct models from a todo schema', () => {
    const adapter = new PostgresStringDataSourceAdapter(schemas.postgres.todo);
    expect(adapter.getModels()).toMatchSnapshot();
  });

  it('sets the correct models from a news schema', () => {
    const adapter = new PostgresStringDataSourceAdapter(schemas.postgres.news);
    expect(adapter.getModels()).toMatchSnapshot();
  });
});
