import { CedarEntitiesDeclaration, CedarEntityDeclaration } from './cedar-entity';
import { CedarSlot } from './cedar-slot';

export type CedarPolicyResource = CedarPolicyResourceAll | CedarPolicyResourceEq | CedarPolicyResourceIn | CedarPolicyResourceIs;

export interface CedarResourceSlot extends CedarSlot {
  slot: '?resource';
}

export interface CedarPolicyResourceAll {
  op: 'All';
}

export type CedarPolicyResourceEq = {
  op: '==';
} & (CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot);

export type CedarPolicyResourceIn = {
  op: 'in';
} & (CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot);

export type CedarPolicyResourceIs = {
  op: 'is';
  entity_type: string;
  in?: CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot;
};
