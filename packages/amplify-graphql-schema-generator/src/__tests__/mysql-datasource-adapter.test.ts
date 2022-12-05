import { DataSourceAdapter } from '../datasource-adapter';
import { Field, Index } from '../schema-representation';

class TestDataSourceAdapter extends DataSourceAdapter {
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
    await adapter.getModels();
    expect(adapter.getTablesList).toBeCalledTimes(1);
    expect(adapter.getFields).toBeCalledTimes(1);
    expect(adapter.getIndexes).toBeCalledTimes(1);
    expect(adapter.getPrimaryKey).toBeCalledTimes(1);
  });
});
