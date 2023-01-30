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
 * Util function to convert any GraphQL input filter argument to an AWS RDS query expression 
 */
export const toRDSFilterExpression = (filter: any): string => { 
  let rdsExpression = '';
  if (filter !== null && filter !== undefined) { 
    const subExpressions = [];
    for (const key in filter) {
      const filterValue = filter[key];
      if (filterValue !== null && filterValue !== undefined) {
        if (key === 'contains') {
          subExpressions.push(` like '%${filterValue}%'`);
        } else if (key === 'eq') {
          subExpressions.push(` = '${filterValue}'`);
        } else if (key === 'ne') {
          subExpressions.push(` != '${filterValue}'`);
        } else if (key === 'lt') {
          subExpressions.push(` < '${filterValue}'`);
        } else if (key === 'le') {
          subExpressions.push(` <= '${filterValue}'`);
        } else if (key === 'gt') {
          subExpressions.push(` > '${filterValue}'`);
        } else if (key === 'ge') {
          subExpressions.push(` >= '${filterValue}'`);
        } else if (key === 'between') {
          subExpressions.push(` between '${filterValue[0]}' and '${filterValue[1]}'`);
        } else if (key === 'beginsWith') {
          subExpressions.push(` like '${filterValue}%'`);
        } else if (key === 'attributeExists') {
          subExpressions.push(` is not null`);
        } else if (key === 'attributeType') {
          subExpressions.push(` is ${filterValue}`);
        } else if (key === 'attributeNotExists') {
          subExpressions.push(` is null`);
        } else if (key === 'in') {
          subExpressions.push(` in (${filterValue.join(',')})`);
        } else if (key === 'notContains') {
          subExpressions.push(` not like '%${filterValue}%'`);
        } else if (key === 'notIn') {
          subExpressions.push(` not in (${filterValue.join(',')})`);
        } else if (key === 'and' || key === 'or') {
          const subExpression = toRDSFilterExpression(filterValue);
          subExpressions.push(` ${key} ${subExpression}`);
        }
      }
    } 
    rdsExpression = subExpressions.join(' and ');
  }
  return rdsExpression;
};
