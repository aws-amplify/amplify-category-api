import { CedarEntity } from './cedar-entity';

export interface CedarSchema {
  entities: {
    [key: string]: CedarEntity;
  };
  actions: {
    [key: string]: CedarEntity;
  };
}
