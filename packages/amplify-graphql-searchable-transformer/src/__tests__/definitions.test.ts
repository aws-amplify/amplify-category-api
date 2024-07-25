import { makeSearchableScalarInputObject } from '../definitions';

describe('makeSearchableScalarInputObject', () => {
  ['ID', 'String', 'Boolean', 'Int', 'Float'].forEach((type: string) => {
    it(`generates scalar for ${type} type`, () => {
      const typeDef = makeSearchableScalarInputObject(type);
      expect(typeDef.name.value).toEqual(`Searchable${type}FilterInput`);
    });
  });

  it('fails on unknown type', () => {
    expect(() => makeSearchableScalarInputObject('CustomType')).toThrowErrorMatchingInlineSnapshot(
      '"Valid types are String, ID, Int, Float, Boolean"',
    );
  });
});
