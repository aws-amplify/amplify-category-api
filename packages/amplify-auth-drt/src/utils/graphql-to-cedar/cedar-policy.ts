import { CedarCondition } from '../internal-representation';
import { CedarPolicyAction } from './cedar-policy-action';
import { CedarPolicyPrincipal } from './cedar-policy-principal';
import { CedarPolicyResource } from './cedar-policy-resource';

export interface CedarPolicy {
  effect: 'permit' | 'forbid';
  principal: CedarPolicyPrincipal;
  action: CedarPolicyAction;
  resource: CedarPolicyResource;
  conditions: CedarCondition[];
  annotations?: {
    [key: string]: string | null;
  };
}
