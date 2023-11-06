import { StringDataSourceAdapter, MySQLStringDataSourceAdapter } from '../datasource-adapter';
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

  protected parseSchema(schema: string): any[] {
    return [];
  }

  protected validateSchema(schema: any[]): void {}

  protected setSchema(schema: any[]): void {}

  protected setFields(fields: any[]): void {}

  protected setIndexes(indexes: any[]): void {}

  protected setTables(tables: any[]): void {}
}

describe('testStringDataSourceAdapter', () => {
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

  it('test mysql datatype mapping', () => {
    const schema = '';
    const adapter = new MySQLStringDataSourceAdapter(schema);
    expect(adapter.mapDataType('varchar', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'String',
    });
    expect(adapter.mapDataType('char', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'String',
    });
    expect(adapter.mapDataType('enum', true, 'table', 'field', 'enum("OPEN","CLOSED")')).toEqual({
      kind: 'Enum',
      name: 'table_field',
      values: ['OPEN', 'CLOSED'],
    });
    expect(adapter.mapDataType('bool', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'Boolean',
    });
    expect(adapter.mapDataType('decimal', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'Float',
    });
    expect(adapter.mapDataType('year', false, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'NonNull',
      type: {
        kind: 'Scalar',
        name: 'Int',
      },
    });
  });

  it('sets the correct models from a todo schema', () => {
    const adapter = new MySQLStringDataSourceAdapter(schemas.mysql.todo);
    expect(adapter.getModels()).toMatchSnapshot();
  });

  it('sets the correct models from a news schema', () => {
    const adapter = new MySQLStringDataSourceAdapter(schemas.mysql.news);
    expect(adapter.getModels()).toMatchSnapshot();
  });
});
