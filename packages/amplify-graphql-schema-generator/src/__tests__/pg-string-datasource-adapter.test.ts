import { StringDataSourceAdapter, PostgresStringDataSourceAdapter } from '../datasource-adapter';
import { Field, FieldType, Index } from '../schema-representation';
import { schemas } from './__utils__/schemas';

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

  protected setSchema(schema: any[]): void {}

  protected validateSchema(schema: any[]): void {}

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
    expect(adapter.getTablesList).toHaveBeenCalledTimes(1);
    expect(adapter.getFields).toHaveBeenCalledTimes(1);
    expect(adapter.getIndexes).toHaveBeenCalledTimes(1);
    expect(adapter.getPrimaryKey).toHaveBeenCalledTimes(1);
  });

  it('test postgres datatype mapping', () => {
    const adapter = new PostgresStringDataSourceAdapter(schemas.postgres.todo);
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

  it('annotates the model field correctly from a schema with a SERIAL field', () => {
    const adapter = new PostgresStringDataSourceAdapter(schemas.postgres.serial);
    expect(adapter.getModels()).toMatchSnapshot();
  });

  it('sets the correct models from a news schema', () => {
    const adapter = new PostgresStringDataSourceAdapter(schemas.postgres.news);
    expect(adapter.getModels()).toMatchSnapshot();
  });

  it('errors on empty schema', () => {
    expect(() => new PostgresStringDataSourceAdapter('')).toThrow('Imported SQL schema is empty.');
    expect(() => new PostgresStringDataSourceAdapter('foo,bar')).toThrow('Imported SQL schema is empty.');
  });

  it('errors on invalid schema', () => {
    expect(() => new PostgresStringDataSourceAdapter('foo,bar\nbaz,bat')).toThrow(
      'Imported SQL schema is invalid. Imported schema is missing columns: enum_name, enum_values, table_name, column_name, column_default, ordinal_position, data_type, udt_name, is_nullable, character_maximum_length, index_columns',
    );
  });
});
