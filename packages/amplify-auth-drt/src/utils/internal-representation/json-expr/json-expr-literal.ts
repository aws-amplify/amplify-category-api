/* eslint-disable import/no-cycle */
export type JsonExprLiteral = boolean | number | string;

export const isJsonExprLiteral = (obj: any): obj is JsonExprLiteral => {
  return typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string';
};
