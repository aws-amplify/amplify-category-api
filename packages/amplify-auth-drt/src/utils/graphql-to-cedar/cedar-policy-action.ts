import { CedarEntitiesDeclaration, CedarEntityDeclaration } from './cedar-entity';
import { CedarSlot } from './cedar-slot';

export type CedarPolicyAction = CedarPolicyActionAll | CedarPolicyActionEq | CedarPolicyActionIn | CedarPolicyActionIs;

export interface CedarActionSlot extends CedarSlot {
  slot: '?action';
}

export interface CedarPolicyActionAll {
  op: 'All';
}

export type CedarPolicyActionEq = {
  op: '==';
} & (CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot);

export type CedarPolicyActionIn = {
  op: 'in';
} & (CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot);

export type CedarPolicyActionIs = {
  op: 'is';
  entity_type: string;
  in?: CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot;
};
