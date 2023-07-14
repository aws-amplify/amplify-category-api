import { toRDSQueryExpression } from '../../../rds-lambda/utils/rds_utils';

describe('filterToRdsExpression', () => {
  // QueryGroup - and, or
  it('should convert and: QueryGroup', () => {
    const filter = {
      and: [{ id: { eq: '123' } }, { name: { eq: 'Amplify' } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ?) AND (name = ?))');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify']);
  });
  it('should convert or: QueryGroup', () => {
    const filter = {
      or: [{ id: { eq: '123' } }, { name: { eq: 'Amplify' } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ?) OR (name = ?))');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify']);
  });
  // Operator - eq, ne, gt, ge, lt, le, contains, notContains, between, beginsWith
  it('should convert eq: Operator', () => {
    const filter = {
      id: { eq: '123' },
      name: { eq: 'Amplify' },
      org: { eq: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id = ? AND name = ? AND org = ?)');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert ne: , eq: Operator', () => {
    const filter = {
      id: { ne: '123' },
      name: { eq: 'Amplify' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id != ? AND name = ?)');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify']);
  });

  it('should convert gt: , eq: Operator', () => {
    const filter = {
      id: { gt: '123' },
      name: { eq: 'Amplify' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id > ? AND name = ?)');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify']);
  });

  it('should convert ge: , eq: , ne:  Operator', () => {
    const filter = {
      id: { ge: '123' },
      name: { eq: 'Amplify' },
      org: { ne: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id >= ? AND name = ? AND org != ?)');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert lt: , eq: , ne:  Operator', () => {
    const filter = {
      id: { lt: '123' },
      name: { eq: 'Amplify' },
      org: { ne: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id < ? AND name = ? AND org != ?)');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert le: , eq: , ne:  Operator', () => {
    const filter = {
      id: { le: '123' },
      name: { ne: 'Amplify' },
      org: { eq: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id <= ? AND name != ? AND org = ?)');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert contains: , eq: , ne:  Operator', () => {
    const filter = {
      id: { ne: '123' },
      name: { contains: 'Amplify' },
      org: { eq: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual("(id != ? AND name LIKE '%?%' AND org = ?)");
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert  eq: , notContains: , ne:  Operator', () => {
    const filter = {
      id: { eq: '123' },
      name: { notContains: 'Amplify' },
      org: { ne: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual("(id = ? AND name NOT LIKE '%?%' AND org != ?)");
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert beginsWith: , eq: , ne:  Operator', () => {
    const filter = {
      id: { eq: '123' },
      name: { beginsWith: 'Amplify' },
      org: { ne: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual("(id = ? AND name LIKE '?%' AND org != ?)");
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert between: , eq: , ne:  Operator', () => {
    const filter = {
      id: { eq: '123' },
      age: { between: ['18', '60'] },
      org: { ne: 'AWS' },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id = ? AND age BETWEEN ? AND ? AND org != ?)');
    expect(queryExpression.queryParams).toEqual(['123', '18', '60', 'AWS']);
  });

  test("filterToRdsExpression > should throw error if between: doesn't have 2 values", () => {
    const filter = {
      id: { eq: '123' },
      age: { between: ['18'] },
      org: { ne: 'AWS' },
    };
    expect(() => {
      toRDSQueryExpression(filter);
    }).toThrowError(/between condition must have two values/);
  });

  // nested QueryGroup & Operators
  it('should convert nested and: or: with Operators', () => {
    const filter = {
      and: [
        { id: { eq: '123' } },
        {
          or: [{ name: { eq: 'Amplify' } }, { org: { eq: 'AWS' } }],
        },
      ],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ?) AND ((name = ?) OR (org = ?)))');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert nested or: and: with Operators', () => {
    const filter = {
      or: [
        { id: { eq: '123' } },
        {
          and: [{ name: { eq: 'Amplify' } }, { org: { eq: 'AWS' } }],
        },
      ],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ?) OR ((name = ?) AND (org = ?)))');
  });

  it('should convert nested and: and: with Operators', () => {
    const filter = {
      and: [
        { id: { eq: '123' } },
        {
          and: [{ name: { eq: 'Amplify' } }, { org: { eq: 'AWS' } }],
        },
      ],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ?) AND ((name = ?) AND (org = ?)))');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS']);
  });

  it('should convert deep nested query and: or: and:', () => {
    const filter = {
      and: [
        { id: { eq: '123' } },
        {
          or: [
            { name: { eq: 'Amplify' } },
            {
              and: [{ org: { eq: 'AWS' } }, { age: { between: ['18', '60'] } }],
            },
          ],
        },
      ],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ?) AND ((name = ?) OR ((org = ?) AND (age BETWEEN ? AND ?))))');
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS', '18', '60']);
  });

  it('should convert deep nested query and: or: and: with multiple operators', () => {
    const filter = {
      id: { eq: '123' },
      and: [
        {
          or: [
            { name: { eq: 'Amplify' } },
            {
              and: [{ org: { eq: 'AWS' } }, { age: { between: ['18', '60'] } }, { name: { beginsWith: 'Amplify' } }],
            },
          ],
        },
      ],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual("(id = ? AND ((name = ?) OR ((org = ?) AND (age BETWEEN ? AND ?) AND (name LIKE '?%'))))");
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS', '18', '60', 'Amplify']);
  });

  it('should convert deep nested query and: or: and: with multiple operators 2', () => {
    const filter = {
      id: { ne: '123' },
      and: [
        {
          or: [
            { name: { eq: 'Amplify' } },
            {
              and: [{ org: { ne: 'AWS' } }, { age: { between: ['18', '60'] } }, { name: { beginsWith: 'Amplify' } }],
            },
          ],
        },
      ],
      or: [{ name: { eq: 'Amplify' } }, { org: { eq: 'AWS' } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual(
      "(id != ? AND ((name = ?) OR ((org != ?) AND (age BETWEEN ? AND ?) AND (name LIKE '?%'))) AND (name = ?) OR (org = ?))",
    );
    expect(queryExpression.queryParams).toEqual(['123', 'Amplify', 'AWS', '18', '60', 'Amplify', 'Amplify', 'AWS']);
  });

  it('should convert deep nested query and: or: and: with multiple operators 3', () => {
    const filter = {
      name: { beginsWith: 'A' },
      or: [
        { name: { eq: 'Amplify' } },
        {
          and: [{ org: { eq: 'AWS' } }, { age: { between: ['18', '60'] } }, { name: { eq: 'Amplify' } }],
        },
      ],
      and: [{ name: { eq: 'Amplify' } }, { org: { eq: 'AWS' } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual(
      "(name LIKE '?%' AND (name = ?) OR ((org = ?) AND (age BETWEEN ? AND ?) AND (name = ?)) AND (name = ?) AND (org = ?))",
    );
    expect(queryExpression.queryParams).toEqual(['A', 'Amplify', 'AWS', '18', '60', 'Amplify', 'Amplify', 'AWS']);
  });

  // size operator tests
  it('should work on size: gt: operator', () => {
    const filter = {
      id: { eq: '123', size: { gt: 1 } },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id = ? AND LENGTH (id) > ?)');
    expect(queryExpression.queryParams).toEqual(['123', 1]);
  });

  it('should work on size: ge: operator', () => {
    const filter = {
      id: { eq: '123', size: { ge: 1 } },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id = ? AND LENGTH (id) >= ?)');
    expect(queryExpression.queryParams).toEqual(['123', 1]);
  });

  it('should work on size: lt: operator', () => {
    const filter = {
      id: { eq: '123', size: { lt: 1 } },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id = ? AND LENGTH (id) < ?)');
    expect(queryExpression.queryParams).toEqual(['123', 1]);
  });

  it('should work on size: le: operator', () => {
    const filter = {
      id: { eq: '123', size: { le: 1 } },
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('(id = ? AND LENGTH (id) <= ?)');
    expect(queryExpression.queryParams).toEqual(['123', 1]);
  });

  it('should work on size: eq: operator along with and: QueryGroup', () => {
    const filter = {
      and: [{ id: { eq: '123', size: { eq: 1 } } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ? AND LENGTH (id) = ?))');
    expect(queryExpression.queryParams).toEqual(['123', 1]);
  });

  it('should work on size: eq: operator along with or: QueryGroup', () => {
    const filter = {
      or: [{ id: { eq: '123', size: { eq: 2 } } }],
      and: [{ age: { eq: '30', size: { eq: 3 } } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual('((id = ? AND LENGTH (id) = ?) AND (age = ? AND LENGTH (age) = ?))');
    expect(queryExpression.queryParams).toEqual(['123', 2, '30', 3]);
  });

  it('should work on size: eq: operator along with or: and: QueryGroup', () => {
    const filter = {
      or: [
        { id: { eq: '123', size: { eq: 2 } } },
        {
          and: [{ age: { eq: '30', size: { eq: 3 } } }],
        },
      ],
      and: [{ age: { eq: '20', size: { eq: 3 } } }, { org: { eq: 'AWS', size: { eq: 3 } } }],
    };
    const queryExpression = toRDSQueryExpression(filter);
    expect(queryExpression.rawSql).toEqual(
      '((id = ? AND LENGTH (id) = ?) OR ((age = ? AND LENGTH (age) = ?)) AND (age = ? AND LENGTH (age) = ?) AND (org = ? AND LENGTH (org) = ?))',
    );
    expect(queryExpression.queryParams).toEqual(['123', 2, '30', 3, '20', 3, 'AWS', 3]);
  });
});
