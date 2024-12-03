import { CedarExprEntity, CedarExprEntityValue, CedarExprLiteral } from '../internal-representation';
import { CedarSlot } from './cedar-slot';

export interface CedarEntity {
  uid: CedarEntityUid;
  parents: CedarEntityUid[];
  attrs: {
    [key: string]: CedarEntityAttributeValue;
  };
}

export type CedarEntityUid = CedarExprEntity | CedarExprEntityValue;

export type CedarEntityAttributeValue = CedarExprLiteral | CedarEntityUid;

export interface CedarEntityDeclaration {
  entity: CedarEntityUid;
}

export interface CedarEntitiesDeclaration {
  entities: CedarEntityUid[];
}
