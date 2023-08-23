import { RDSLayerMapping } from '@aws-amplify/graphql-transformer-interfaces';
import { DatasourceType } from '../config';
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
  modelToDatasourceMap?: Map<string, DatasourceType>;
  datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>;
  rdsLayerMapping?: RDSLayerMapping;
  customQueries?: Map<string, string>;
};
