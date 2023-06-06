import { AmplifyApiGraphQlResourceStackTemplate } from '@aws-amplify/graphql-transformer-interfaces';
import { DatasourceType } from '../config';
import { RDSConnectionSecrets } from '../types';
import { StackManager } from '../transformer-context/stack-manager';

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
  applyOverride: (stackManager: StackManager) => AmplifyApiGraphQlResourceStackTemplate;
};

export type DatasourceTransformationConfig = {
  modelToDatasourceMap?: Map<string, DatasourceType>;
  datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>;
}
