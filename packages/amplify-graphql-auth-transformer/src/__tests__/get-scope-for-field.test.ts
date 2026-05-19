import { parse, ObjectTypeDefinitionNode } from 'graphql';
import { ResolverResourceIDs } from 'graphql-transformer-common';
import { getScopeForField } from '../utils';

const getObjectType = (schema: string): ObjectTypeDefinitionNode => parse(schema).definitions[0] as ObjectTypeDefinitionNode;

describe('getScopeForField', () => {
  it('uses resource-aware stack sharding for function fields', () => {
    const functionScope = {};
    const getScopeFor = jest.fn(() => functionScope);
    const getStack = jest.fn();
    const ctx = {
      stackManager: {
        getScopeFor,
        getStack,
      },
    };
    const objectType = getObjectType(`
      type Query {
        movie: String @function(name: "movieFn")
      }
    `);

    expect(getScopeForField(ctx as any, objectType, 'movie', false)).toBe(functionScope);
    expect(getScopeFor).toHaveBeenCalledWith(ResolverResourceIDs.ResolverResourceID('Query', 'movie'), 'FunctionDirectiveStack');
    expect(getStack).not.toHaveBeenCalledWith('FunctionDirectiveStack');
  });
});
