import {
  iff,
  ref,
  notEquals,
  methodCall,
  compoundExpression,
  obj,
  printBlock,
  toJson,
  str,
  not,
} from 'graphql-mapping-template';
const API_KEY = 'API Key Authorization';
/**
 * Util function to generate sandbox mode expression
 */
export const generateAuthExpressionForSandboxMode = (enabled: boolean): string => {
  let exp;

  if (enabled) exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY)), methodCall(ref('util.unauthorized')));
  else exp = methodCall(ref('util.unauthorized'));

  return printBlock(`Sandbox Mode ${enabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), exp), toJson(obj({}))]),
  );
};

/**
 * Util function to generate resolver key used to keep track of all the resolvers in memory
 * @param typeName Name of the type
 * @param fieldName Name of the field
 */
export const generateResolverKey = (typeName: string, fieldName: string): string => {
  return `${typeName}.${fieldName}`;
};

/**
 * Util method to convert any GraphQL input filter argument to an AWS RDS query expression 
 */
export const toRDSQueryExpression = (filter: any): string => {
    let rdsExpression = '';
    Object.entries(filter).forEach(([key, value]:any, index) => {
        switch(key) {
            case 'and':
            case `or`:
                rdsExpression += value.map(toRDSQueryExpression).join(` ${key.toUpperCase()} `);
                break;
            case `not`:
                // todo: equivalent of `not` in RDS
                rdsExpression += `NOT ${toRDSQueryExpression(value)}`;
                break;
            default:
                Object.entries(value).forEach(([operator, operand]:any) => {
                    if (index != 0) {
                        rdsExpression += ` AND `;
                    }
                    switch(operator) {
                    case `attributeExists`:
                        rdsExpression += `${key} IS NOT NULL`;
                        break;
                    case `beginsWith`:
                        rdsExpression += `${key} LIKE '${operand}%'`;
                        break;
                    case `between`:
                        case 'between':
                        if(!Array.isArray(operand) || operand.length !== 2) {
                            throw new Error(`between condition must have two values, but got: ${operand}.length`);
                        } 
                        rdsExpression += `${key} BETWEEN '${operand[0]}' AND '${operand[1]}'`;
                        break;
                    case `contains`:
                        rdsExpression += `${key} LIKE '%${operand}%'`;
                        break;
                    case `eq`:
                        rdsExpression += `${key} = '${operand}'`;
                        break;
                    case `ge`:
                        rdsExpression += `${key} >= '${operand}'`;
                        break;
                    case `gt`:
                        rdsExpression += `${key} > '${operand}'`;
                        break;
                    case `le`:
                        rdsExpression += `${key} <= '${operand}'`;
                        break;    
                    case `lt`:
                        rdsExpression += `${key} < '${operand}'`;
                        break; 
                    case `ne`:
                        rdsExpression += `${key} != '${operand}'`;
                        break;
                    case `notContains`:
                        rdsExpression += `${key} NOT LIKE '%${operand}%'`;
                        break;
                    case `size`:
                        // implement size
                        break;
                    default:
                        console.log(`Unsupported operator: ${operator}`);   
                    }
                });
            }
        });
    return `(${rdsExpression})`;
};
