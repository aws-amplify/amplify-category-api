/* eslint-disable import/no-cycle */
import { JsonExprAnd } from './json-expr-and';
import { JsonExprAttrAccess } from './json-expr-attr-access';
import { JsonExprEntity } from './json-expr-entity';
import { JsonExprEq } from './json-expr-eq';
import { JsonExprHas } from './json-expr-has';
import { JsonExprIs } from './json-expr-is';
import { JsonExprLiteral } from './json-expr-literal';
import { JsonExprOr } from './json-expr-or';
import { JsonExprRecord } from './json-expr-record';
import { JsonExprUnknown } from './json-expr-unknown';
import { JsonExprValue } from './json-expr-value';
import { JsonExprVar } from './json-expr-var';

export type JsonExpr =
  | JsonExprAnd
  | JsonExprAttrAccess
  | JsonExprEntity
  | JsonExprEq
  | JsonExprHas
  | JsonExprIs
  | JsonExprLiteral
  | JsonExprOr
  | JsonExprRecord
  | JsonExprUnknown
  | JsonExprValue
  | JsonExprVar;
