/**
 * Util method to convert any GraphQL input filter argument to an AWS RDS query expression 
 */
export const toRDSQueryExpression = (filter: any) => {
    let rdsExpression = '';
    let isAndAppended = false;
    Object.entries(filter).forEach(([key, value]: any, index) => {
        if(index != 0) {
            rdsExpression += ` AND `;
            isAndAppended = true;
        }
        switch(key) {
            case 'and':
            case 'or':
                rdsExpression += value.map(toRDSQueryExpression).join(` ${key.toUpperCase()} `);
                break;
            case 'not':
                rdsExpression += `NOT ${toRDSQueryExpression(value)}`;
                break;
            default:
                Object.entries(value).forEach(([operator, operand]: any, secondIndex) => {
                    if(secondIndex != 0) {
                        rdsExpression += ` AND `;
                    }
                    switch(operator) {
                        case 'attributeExists':
                            rdsExpression += `${key} IS NOT NULL`;
                            break;
                        case 'beginsWith':
                            rdsExpression += `${key} LIKE '${operand}%'`;
                            break;
                        case 'between':
                            if (!Array.isArray(operand) || operand.length !== 2) {
                                throw new Error(`between condition must have two values, but got: ${operand}.length`);
                            }
                            rdsExpression += `${key} BETWEEN '${operand[0]}' AND '${operand[1]}'`;
                            break;
                        case 'contains':
                            rdsExpression += `${key} LIKE '%${operand}%'`;
                            break;
                        case 'eq':
                            rdsExpression += `${key} = '${operand}'`;
                            break;
                        case 'ge':
                            rdsExpression += `${key} >= '${operand}'`;
                            break;
                        case 'gt':
                            rdsExpression += `${key} > '${operand}'`;
                            break;
                        case 'le':
                            rdsExpression += `${key} <= '${operand}'`;
                            break;
                        case 'lt':
                            rdsExpression += `${key} < '${operand}'`;
                            break;
                        case 'ne':
                            rdsExpression += `${key} != '${operand}'`;
                            break;
                        case 'notContains':
                            // key : name , operand : 'a' , operator : notContains
                            rdsExpression += `${key} NOT LIKE '%${operand}%'`;
                            break;
                        case 'size':
                            // size has nested operators:- between, eq, ge, gt, le, lt, ne
                            Object.entries(operand).forEach(([sizeOperator, sizeOperand]: any) => {
                                if(index != 0 && !isAndAppended) {
                                    rdsExpression += ` AND `;
                                    isAndAppended = true;
                                }
                                switch(sizeOperator) {
                                    case 'between':
                                        if (!Array.isArray(sizeOperand) || sizeOperand.length !== 2) {
                                            throw new Error(`between condition must have two values, but got: ${sizeOperand}.length`);
                                        }
                                        rdsExpression += `LENGTH (${key}) BETWEEN '${sizeOperand[0]}' AND '${sizeOperand[1]}'`;
                                        break;
                                    case 'eq':
                                        rdsExpression += `LENGTH (${key}) = '${sizeOperand}'`; 
                                        break;
                                    case 'ge':
                                        rdsExpression += `LENGTH (${key}) >= '${sizeOperand}'`;
                                        break;
                                    case 'gt':
                                        rdsExpression += `LENGTH (${key}) > '${sizeOperand}'`;
                                        break;
                                    case 'le':
                                        rdsExpression += `LENGTH (${key}) <= '${sizeOperand}'`;
                                        break;
                                    case 'lt':
                                        rdsExpression += `LENGTH (${key}) < '${sizeOperand}'`;
                                        break;
                                    case 'ne':
                                        rdsExpression += `LENGTH (${key}) != '${sizeOperand}'`;
                                        break;
                                    default:
                                        console.log(`Unsupported operator: ${sizeOperator}`);
                                }
                            });
                            break;
                        default:
                            console.log(`Unsupported operator: ${operator}`);
                    }
                });
            }
    });
    return `(${rdsExpression})`;
};