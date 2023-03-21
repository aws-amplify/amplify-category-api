import { TypeNode } from 'graphql';
import { resolveFieldTypeName } from '../../helpers/resolve-field-type-name';

describe('resolve field type name', () => {
  it('resolves field type for NamedType case', () => {
    const example = {
      kind: 'NamedType',
      name: {
        value: 'hello world',
      },
    };
    const value = resolveFieldTypeName(example as TypeNode);
    expect(value).toBe('hello world');
  });

  it('resolves field type for NonNullType / NamedType case', () => {
    const example = {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: {
          value: 'hello world',
        },
      },
    };
    const value = resolveFieldTypeName(example as TypeNode);
    expect(value).toBe('hello world');
  });

  it('resolves field type for NonNullType / other case', () => {
    const example = {
      kind: 'NonNullType',
      type: {
        kind: 'other',
        name: {
          value: 'hello world',
        },
      },
    };
    expect(() => resolveFieldTypeName(example as TypeNode)).toThrow(`Unknown type ${example}`);
  });

  it('resolves field type for NonNullType / ListType case', () => {
    const example = {
      kind: 'NonNullType',
      type: {
        kind: 'ListType',
        type: {
          kind: 'NamedType',
          name: {
            value: 'hello world',
          },
        },
      },
    };
    const value = resolveFieldTypeName(example as TypeNode);
    expect(value).toBe('hello world');
  });

  it('resolves field type for NonNullType / ListType / NonNullType case', () => {
    const example = {
      kind: 'NonNullType',
      type: {
        kind: 'ListType',
        type: {
          kind: 'NonNullType',
          type: {
            kind: 'NamedType',
            name: {
              value: 'hello world',
            },
          },
        },
      },
    };
    const value = resolveFieldTypeName(example as TypeNode);
    expect(value).toBe('hello world');
  });

  it('resolves field type for NonNullType / ListType / other case', () => {
    const example = {
      kind: 'NonNullType',
      type: {
        kind: 'ListType',
        type: {
          kind: 'other',
          type: {
            kind: 'NamedType',
            name: {
              value: 'hello world',
            },
          },
        },
      },
    };
    expect(() => resolveFieldTypeName(example as TypeNode)).toThrow(`Unknown type ${example}`);
  });

  it('resolves field type for other case', () => {
    const example = {
      kind: 'other',
      name: {
        value: '',
      },
    };
    expect(() => resolveFieldTypeName(example as TypeNode)).toThrow(`Unknown type ${example}`);
  });

  it('resolves field type for ListType / NamedType case', () => {
    const example = {
      kind: 'ListType',
      type: {
        kind: 'NamedType',
        name: {
          value: 'hello world',
        },
      },
    };
    const value = resolveFieldTypeName(example as TypeNode);
    expect(value).toBe('hello world');
  });

  it('resolves field type for ListType / NonNullType case', () => {
    const example = {
      kind: 'ListType',
      type: {
        kind: 'NonNullType',
        type: {
          kind: 'NamedType',
          name: {
            value: 'hello world',
          },
        },
      },
    };
    const value = resolveFieldTypeName(example as TypeNode);
    expect(value).toBe('hello world');
  });

  it('resolves field type for ListType / other case', () => {
    const example = {
      kind: 'ListType',
      type: {
        kind: 'other',
        type: {
          kind: 'NamedType',
          name: {
            value: 'hello world',
          },
        },
      },
    };
    expect(() => resolveFieldTypeName(example as TypeNode)).toThrow(`Unknown type ${example}`);
  });
});
