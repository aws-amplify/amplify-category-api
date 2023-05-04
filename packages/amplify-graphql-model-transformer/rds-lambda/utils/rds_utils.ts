export type RDSQueryFilter = {
  rawSql: string;
  queryParams?: any[];
}

/**
 * Util method to convert any GraphQL input filter argument to an AWS RDS query expression
 * @param filter The filter used on a given type, following generated format in AppSync
 */
export const toRDSQueryExpression = (filter: any): RDSQueryFilter => {
  let rdsExpression = '';
  let isAndAppended = false;
  const queryParameters = new Array<any>();
  Object.entries(filter).forEach(([key, value]: any, index) => {
    if (index !== 0) {
      rdsExpression += ' AND ';
      isAndAppended = true;
    }
    switch (key) {
      case 'and':
      case 'or':
        rdsExpression += value.map((subValue: any) => {
          const { rawSql, queryParams } = toRDSQueryExpression(subValue);
          if (queryParams) {
            queryParameters.push(...queryParams);
          }
          return rawSql;
        }).join(` ${key.toUpperCase()} `);
        break;
      case 'not':
        // eslint-disable-next-line no-case-declarations
        const { rawSql, queryParams } = toRDSQueryExpression(value);
        rdsExpression += `NOT ${rawSql}`;
        if (queryParams) {
          queryParameters.push(...queryParams);
        }
        break;
      default:
        Object.entries(value).forEach(([operator, operand]: any, secondIndex) => {
          if (secondIndex !== 0) {
            rdsExpression += ' AND ';
          }
          switch (operator) {
            case 'attributeExists':
              rdsExpression += `${key} IS NOT NULL`;
              break;
            case 'beginsWith':
              rdsExpression += `${key} LIKE '?%'`;
              queryParameters.push(operand);
              break;
            case 'between':
              if (!Array.isArray(operand) || operand.length !== 2) {
                throw new Error(`between condition must have two values, but got: ${operand?.length ? operand.length : 'not an array'}`);
              }
              rdsExpression += `${key} BETWEEN ? AND ?`;
              queryParameters.push(...operand);
              break;
            case 'contains':
              rdsExpression += `${key} LIKE '%?%'`;
              queryParameters.push(operand);
              break;
            case 'eq':
              rdsExpression += `${key} = ?`;
              queryParameters.push(operand);
              break;
            case 'ge':
              rdsExpression += `${key} >= ?`;
              queryParameters.push(operand);
              break;
            case 'gt':
              rdsExpression += `${key} > ?`;
              queryParameters.push(operand);
              break;
            case 'le':
              rdsExpression += `${key} <= ?`;
              queryParameters.push(operand);
              break;
            case 'lt':
              rdsExpression += `${key} < ?`;
              queryParameters.push(operand);
              break;
            case 'ne':
              rdsExpression += `${key} != ?`;
              queryParameters.push(operand);
              break;
            case 'notContains':
              // key : name , operand : 'a' , operator : notContains
              rdsExpression += `${key} NOT LIKE '%?%'`;
              queryParameters.push(operand);
              break;
            case 'size':
              // size has nested operators:- between, eq, ge, gt, le, lt, ne
              Object.entries(operand).forEach(([sizeOperator, sizeOperand]: any) => {
                if (index !== 0 && !isAndAppended) {
                  rdsExpression += ' AND ';
                  isAndAppended = true;
                }
                switch (sizeOperator) {
                  case 'between':
                    if (!Array.isArray(sizeOperand) || sizeOperand.length !== 2) {
                      throw new Error(`between condition must have two values, but got: ${sizeOperand}.length`);
                    }
                    rdsExpression += `LENGTH (${key}) BETWEEN ? AND ?`;
                    queryParameters.push(...sizeOperand);
                    break;
                  case 'eq':
                    rdsExpression += `LENGTH (${key}) = ?`;
                    queryParameters.push(sizeOperand);
                    break;
                  case 'ge':
                    rdsExpression += `LENGTH (${key}) >= ?`;
                    queryParameters.push(sizeOperand);
                    break;
                  case 'gt':
                    rdsExpression += `LENGTH (${key}) > ?`;
                    queryParameters.push(sizeOperand);
                    break;
                  case 'le':
                    rdsExpression += `LENGTH (${key}) <= ?`;
                    queryParameters.push(sizeOperand);
                    break;
                  case 'lt':
                    rdsExpression += `LENGTH (${key}) < ?`;
                    queryParameters.push(sizeOperand);
                    break;
                  case 'ne':
                    rdsExpression += `LENGTH (${key}) != ?`;
                    queryParameters.push(sizeOperand);
                    break;
                  default:
                    throw new Error(`Unsupported operator: ${sizeOperator}`);
                }
              });
              break;
            default:
              throw new Error(`Unsupported operator: ${operator}`);
          }
        });
    }
  });
  return {
    rawSql: `(${rdsExpression})`,
    queryParams: queryParameters,
  };
};
