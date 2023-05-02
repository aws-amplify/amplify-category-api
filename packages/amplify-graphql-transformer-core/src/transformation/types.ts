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

export type OverrideConfig = {
  overrideFlag: boolean;
  overrideDir: string;
  resourceName: string;
};

export type DatasourceTransformationConfig = {
  modelToDatasourceMap?: Map<string, DatasourceType>;
  datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>;
}
