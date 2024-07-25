import { DataSourceInstance, TransformerDataSourceManagerProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode } from 'graphql';

export class TransformerDataSourceManager implements TransformerDataSourceManagerProvider {
  private dataSourceMap: Map<string, DataSourceInstance> = new Map();

  add = (type: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode, dataSourceInstance: DataSourceInstance): void => {
    const key = type.name.value;
    if (this.dataSourceMap.has(key)) {
      throw new Error(`DataSource already exists for type ${key}`);
    }
    this.dataSourceMap.set(key, dataSourceInstance);
  };

  get = (type: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode): DataSourceInstance => {
    const key = type.name.value;
    if (!this.dataSourceMap.has(key)) {
      throw new Error(`DataSource for type ${key} does not exist`);
    }
    return this.dataSourceMap.get(key)!;
  };

  collectDataSources = (): Readonly<Map<string, DataSourceInstance>> => {
    return this.dataSourceMap;
  };

  has = (name: string): boolean => {
    return this.dataSourceMap.has(name);
  };
}
