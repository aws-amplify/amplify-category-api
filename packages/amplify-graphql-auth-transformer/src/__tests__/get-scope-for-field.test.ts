import { parse, ObjectTypeDefinitionNode } from 'graphql';
import { getScopeForField } from '../utils';

const getObjectType = (schema: string): ObjectTypeDefinitionNode => parse(schema).definitions[0] as ObjectTypeDefinitionNode;

describe('getScopeForField', () => {
  it('keeps function field auth resources in the original function stack after resource-aware sizing', () => {
    const functionScope = {};
    const originalFunctionStack = {};
    const getScopeFor = jest.fn(() => functionScope);
    const getStack = jest.fn(() => originalFunctionStack);
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

    expect(getScopeForField(ctx as any, objectType, 'movie', false)).toBe(originalFunctionStack);
    expect(getScopeFor).not.toHaveBeenCalled();
    expect(getStack).toHaveBeenCalledWith('FunctionDirectiveStack');
  });
});
