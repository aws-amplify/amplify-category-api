import { getTableNameForModel } from '../tableNameMap';

describe('getTableNameForModel', () => {
  it('returns a mapped table name', () => {
    const schema = /* GraphQL */ `
      type Foo @mapsTo(name: "FooOriginal") {
        id: ID!
      }
    `;

    expect(getTableNameForModel(schema, 'Foo')).toEqual('FooOriginal');
  });

  it('returns the original table name for unmapped models', () => {
    const schema = /* GraphQL */ `
      type Foo {
        id: ID!
      }
    `;

    expect(getTableNameForModel(schema, 'Foo')).toEqual('Foo');
  });

  it('throws an error if name is empty', () => {
    const schema = /* GraphQL */ `
      type Foo @mapsTo(name: "") {
        id: ID!
      }
    `;

    expect(() => getTableNameForModel(schema, 'Foo')).toThrow();
  });
});
