import { DataSourceAdapter, MySQLDataSourceAdapter } from '../datasource-adapter';
import { Field, FieldType, Index } from '../schema-representation';

class TestDataSourceAdapter extends DataSourceAdapter {
  public async initialize(): Promise<void> {
    // Do Nothing
  }
  public mapDataType(type: string, nullable: boolean): FieldType {
    return {
      kind: 'Scalar',
      name: 'String',
    }
  }
  public async getTablesList(): Promise<string[]> {
    return ['Test'];
  }
  public async getFields(tableName: string): Promise<Field[]> {
    return [];
  }
  public async getPrimaryKey(tableName: string): Promise<Index | null> {
    return null;
  }
  public async getIndexes(tableName: string): Promise<Index[]> {
    return [];
  }
  public cleanup(): void {
    // Do Nothing
  }
}

describe('testDataSourceAdapter', () => {
  it('getModels call the default implementation', async () => {
    let adapter: DataSourceAdapter = new TestDataSourceAdapter();
    adapter.getTablesList = jest.fn(async () => ['Test']);
    adapter.getFields = jest.fn(async () => []);
    adapter.getPrimaryKey = jest.fn();
    adapter.getIndexes = jest.fn(async () => []);
    adapter.mapDataType = jest.fn();
    await adapter.getModels();
    expect(adapter.getTablesList).toBeCalledTimes(1);
    expect(adapter.getFields).toBeCalledTimes(1);
    expect(adapter.getIndexes).toBeCalledTimes(1);
    expect(adapter.getPrimaryKey).toBeCalledTimes(1);
  });

  it('test mysql datatype mapping', () => {
    const config = {
      host: "host",
      database: "database",
      port: 1234,
      username: "username",
      password: "password",
    };
    const adapter = new MySQLDataSourceAdapter(config);
    expect(adapter.mapDataType('varchar', true)).toEqual({
      "kind": "Scalar",
      "name": "String",
    });
    expect(adapter.mapDataType('char', true)).toEqual({
      "kind": "Scalar",
      "name": "String",
    });
    expect(adapter.mapDataType('enum', true)).toEqual({
      "kind": "Scalar",
      "name": "String",
    });
    expect(adapter.mapDataType('bool', true)).toEqual({
      "kind": "Scalar",
      "name": "Boolean",
    });
    expect(adapter.mapDataType('decimal', true)).toEqual({
      "kind": "Scalar",
      "name": "Float",
    });
    expect(adapter.mapDataType('year', false)).toEqual({
      "kind": "NonNull",
      "type": {
        "kind": "Scalar",
        "name": "Int",
      },
    });
  });
});
