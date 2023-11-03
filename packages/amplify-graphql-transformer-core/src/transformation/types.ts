import { DataSourceType, RDSLayerMapping } from '@aws-amplify/graphql-transformer-interfaces';
import { RDSConnectionSecrets } from '../types';

export type UserDefinedSlot = {
  resolverTypeName: string;
  resolverFieldName: string;
  slotName: string;
  requestResolver?: UserDefinedResolver;
  responseResolver?: UserDefinedResolver;
};

export type UserDefinedResolver = {
  fileName: string;
  template: string;
};

export type DatasourceTransformationConfig = {
  modelToDatasourceMap?: Map<string, DataSourceType>;
  datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>;
  rdsLayerMapping?: RDSLayerMapping;
};
