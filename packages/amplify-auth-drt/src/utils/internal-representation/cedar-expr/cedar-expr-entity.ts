/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExprEntity } from '../json-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';

export interface CedarExprEntity {
  __entity: CedarExprEntityValue;
}

export interface CedarExprEntityValue {
  type: string;
  id: string;
}

export const isCedarExprEntity = (obj: any): obj is CedarExprEntity => {
  return hasKey(obj, '__entity') && isCedarExprEntityValue(obj['__entity']);
};

export const isCedarExprEntityValue = (obj: any): obj is CedarExprEntityValue => {
  return hasKey(obj, 'type') && hasKey(obj, 'id') && typeof obj.type === 'string' && typeof obj.id === 'string';
};

export const cedarExprEntityToJsonExpr = (cedarExpr: CedarExprEntity, _: CedarConcreteValueMap | undefined = undefined): JsonExprEntity => {
  return {
    __entity: {
      type: cedarExpr['__entity'].type,
      id: cedarExpr['__entity'].id,
    },
  };
};
