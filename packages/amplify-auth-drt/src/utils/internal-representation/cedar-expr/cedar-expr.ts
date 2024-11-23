/* eslint-disable import/no-cycle */
import { CedarExprAnd } from './cedar-expr-and';
import { CedarExprAttrAccess } from './cedar-expr-attr-access';
import { CedarExprEntity } from './cedar-expr-entity';
import { CedarExprEq } from './cedar-expr-eq';
import { CedarExprHas } from './cedar-expr-has';
import { CedarExprIs } from './cedar-expr-is';
import { CedarExprLiteral } from './cedar-expr-literal';
import { CedarExprOr } from './cedar-expr-or';
import { CedarExprRecord } from './cedar-expr-record';
import { CedarExprUnknown } from './cedar-expr-unknown';
import { CedarExprValue } from './cedar-expr-value';
import { CedarExprVar } from './cedar-expr-var';

export type CedarExpr =
  | CedarExprAnd
  | CedarExprAttrAccess
  | CedarExprEntity
  | CedarExprEq
  | CedarExprHas
  | CedarExprIs
  | CedarExprLiteral
  | CedarExprOr
  | CedarExprRecord
  | CedarExprUnknown
  | CedarExprValue
  | CedarExprVar;
