import { CedarEntitiesDeclaration, CedarEntityDeclaration } from './cedar-entity';
import { CedarSlot } from './cedar-slot';

export type CedarPolicyPrincipal = CedarPolicyPrincipalAll | CedarPolicyPrincipalEq | CedarPolicyPrincipalIn | CedarPolicyPrincipalIs;

export interface CedarPrincipalSlot extends CedarSlot {
  slot: '?principal';
}

export interface CedarPolicyPrincipalAll {
  op: 'All';
}

export type CedarPolicyPrincipalEq = {
  op: '==';
} & (CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot);

export type CedarPolicyPrincipalIn = {
  op: 'in';
} & (CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot);

export type CedarPolicyPrincipalIs = {
  op: 'is';
  entity_type: string;
  in?: CedarEntityDeclaration | CedarEntitiesDeclaration | CedarSlot;
};
