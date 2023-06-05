import { parseValue } from 'graphql';
import { defaultProviderMap } from '../auth';

/**
 * Create a graphql name node given a name value
 * @param name
 */
export function createNameNode(name: any) {
  return {
    kind: 'Name',
    value: name,
  };
}

/**
 *
 * @param name
 * @param args
 */
export function createDirectiveNode(name: any, args: any) {
  return {
    kind: 'Directive',
    name: createNameNode(name),
    arguments: args,
  };
}

/**
 *
 * @param name
 * @param value
 */
export function createArgumentNode(name: any, value: any) {
  return {
    kind: 'Argument',
    name: createNameNode(name),
    value,
  };
}

/**
 *
 * @param values
 */
export function createListValueNode(values: any) {
  return {
    kind: 'ListValue',
    values,
  };
}

/**
 * Note this only supports strategy, provider and operations. Group and owner auth is not supported
 * @param strategy
 * @param provider
 * @param operations
 */
export function createAuthRule(strategy: any, provider: any, operations?: any) {
  let rule = `{allow: ${strategy}`;
  if (provider && provider !== defaultProviderMap.get(strategy)) {
    rule += `, provider: ${provider}`;
  }

  if (operations && operations.length !== 4) {
    rule += `, operations: [${operations.join(', ')}]`;
  }
  rule += '}';
  return parseValue(rule);
}
