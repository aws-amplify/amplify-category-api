import { toRDSQueryExpression } from './../../../rds-lambda/utils/rds_utils';

describe('filterToRdsExpression', () => {
    // QueryGroup - and, or 
    it('should convert and: QueryGroup ', () => {
    const filter = {
        and : [
            { id : { eq : '123' } },
            { name : { eq : 'Amplify' } },
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("((id = '123') AND (name = 'Amplify'))");
    }); 
    it('should convert or: QueryGroup ', () => {
    const filter = {
        or : [
            { id : { eq : '123' } },
            { name : { eq : 'Amplify' } },
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("((id = '123') OR (name = 'Amplify'))");
    });
    // Operator - eq, ne, gt, ge, lt, le, contains, notContains, between, beginsWith
    it('should convert eq: Operator ', () => {
    const filter = {
        id : { eq : '123' },
        name: { eq : 'Amplify' },
        org: { eq : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND name = 'Amplify' AND org = 'AWS')");
    });

    it('should convert ne: , eq: Operator ', () => {
    const filter = {
        id : { ne : '123' },
        name: { eq : 'Amplify' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id != '123' AND name = 'Amplify')");
    });

    it('should convert gt: , eq: Operator ', () => {
    const filter = {
        id : { gt : '123' },
        name: { eq : 'Amplify' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id > '123' AND name = 'Amplify')");
    });

    it('should convert ge: , eq: , ne:  Operator ', () => {
    const filter = {
        id : { ge : '123' },
        name: { eq : 'Amplify' },
        org: { ne : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id >= '123' AND name = 'Amplify' AND org != 'AWS')");
    });

    it('should convert lt: , eq: , ne:  Operator ', () => {
    const filter = {
        id : { lt : '123' },
        name: { eq : 'Amplify' },
        org: { ne : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id < '123' AND name = 'Amplify' AND org != 'AWS')");
    });

    it('should convert le: , eq: , ne:  Operator ', () => {
    const filter = {
        id : { le : '123' },
        name: { ne : 'Amplify' },
        org: { eq : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id <= '123' AND name != 'Amplify' AND org = 'AWS')");
    });

    it('should convert contains: , eq: , ne:  Operator ', () => {
    const filter = {
        id : {  ne : '123' },
        name: { contains : 'Amplify' },
        org: { eq : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id != '123' AND name LIKE '%Amplify%' AND org = 'AWS')");
    });

    it('should convert  eq: , notContains: , ne:  Operator ', () => {
    const filter = {
        id : {  eq : '123' },
        name: { notContains : 'Amplify' },
        org: { ne : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND name NOT LIKE '%Amplify%' AND org != 'AWS')");
    });

    it('should convert beginsWith: , eq: , ne:  Operator ', () => {
    const filter = {
        id : {  eq : '123' },
        name: { beginsWith : 'Amplify' },
        org: { ne : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND name LIKE 'Amplify%' AND org != 'AWS')");
    });

    it('should convert between: , eq: , ne:  Operator ', () => {
    const filter = {
        id : {  eq : '123' },
        age: { between : ['18', '60'] },
        org: { ne : 'AWS' },
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND age BETWEEN '18' AND '60' AND org != 'AWS')");
    });

    test('filterToRdsExpression > should throw error if between: doesn\'t have 2 values', () => {
        const filter = {
          id : { eq : '123' },
          age: { between : ['18'] },
          org: { ne : 'AWS' },
        };
        expect(() => {toRDSQueryExpression(filter);}).toThrowError(/between condition must have two values/);
      });

    // nested QueryGroup & Operators
    it('should convert nested and: or: with Operators ', () => {
    const filter = {
        and : [
            { id : { eq : '123' } },
            { or : [
                { name : { eq : 'Amplify' } },
                { org : { eq : 'AWS' } },
            ]},
        ],
    }; 
    expect(toRDSQueryExpression(filter)).toEqual("((id = '123') AND ((name = 'Amplify') OR (org = 'AWS')))");
    });

    it('should convert nested or: and: with Operators ', () => {
    const filter = {
        or : [
            { id : { eq : '123' } },
            { and : [
                { name : { eq : 'Amplify' } },
                { org : { eq : 'AWS' } },
            ]},
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("((id = '123') OR ((name = 'Amplify') AND (org = 'AWS')))");
    });

    it('should convert nested and: and: with Operators ', () => {
    const filter = {
        and : [
            { id : { eq : '123' } },
            { and : [
                { name : { eq : 'Amplify' } },
                { org : { eq : 'AWS' } },
            ]},
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("((id = '123') AND ((name = 'Amplify') AND (org = 'AWS')))");
    });

    it('should convert deep nested query and: or: and: ', () => {
    const filter = {
        and : [
            { id : { eq : '123' } },
            { or : [
                { name : { eq : 'Amplify' } },
                { and : [
                    { org : { eq : 'AWS' } },
                    { age : { between : [`18`, `60`] } },
                ]},
            ]},
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("((id = '123') AND ((name = 'Amplify') OR ((org = 'AWS') AND (age BETWEEN '18' AND '60'))))");
    });

    it(`should convert deep nested query and: or: and: with multiple operators`, () => {
    const filter = {
        id: { eq: '123' },
        and : [
            { or : [
                { name : { eq : 'Amplify' } },
                { and : [
                    { org : { eq : 'AWS' } },
                    { age : { between : [`18`, `60`] } },
                    { name : { beginsWith : 'Amplify' } },
                ]},
            ]},
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND ((name = 'Amplify') OR ((org = 'AWS') AND (age BETWEEN '18' AND '60') AND (name LIKE 'Amplify%'))))");
    });

    it(`should convert deep nested query and: or: and: with multiple operators`, () => {
    const filter = {
        id: { ne: '123' },
        and : [
            { or : [
                { name : { eq : 'Amplify' } },
                { and : [
                    { org : { ne : 'AWS' } },
                    { age : { between : [`18`, `60`] } },
                    { name : { beginsWith : 'Amplify' } },
                ]},
            ]},
        ],
        or : [
            { name : { eq : 'Amplify' } },  
            { org : { eq : 'AWS' } },
        ],
    };
    expect(toRDSQueryExpression(filter)).toEqual("(id != '123' AND ((name = 'Amplify') OR ((org != 'AWS') AND (age BETWEEN '18' AND '60') AND (name LIKE 'Amplify%'))) AND (name = 'Amplify') OR (org = 'AWS'))");
    });

    it(`should convert deep nested query and: or: and: with multiple operators`, () => {
        const filter = {
            name : { beginsWith : 'A' },
            or : [
                { name : { eq : 'Amplify' } },
                { and : [
                    { org : { eq : 'AWS' } },
                    { age : { between : [`18`, `60`] } },
                    { name : { eq : 'Amplify' } },
                ]},
            ],
            and : [
                { name : { eq : 'Amplify' } },  
                { org : { eq : 'AWS' } },
            ],
        };
    expect(toRDSQueryExpression(filter)).toEqual("(name LIKE 'A%' AND (name = 'Amplify') OR ((org = 'AWS') AND (age BETWEEN '18' AND '60') AND (name = 'Amplify')) AND (name = 'Amplify') AND (org = 'AWS'))");
     });

     // size operator tests
    it(`should work on size: gt: operator`, () => {
    const filter = {
        id : { eq : '123', size : { gt : 1 } },
    }
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND LENGTH (id) > '1')");
    });

    it(`should work on size: ge: operator`, () => {
        const filter = {
            id : { eq : '123', size : { ge : 1 } },
        }
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND LENGTH (id) >= '1')");
    });

    it(`should work on size: lt: operator`, () => {
        const filter = {
            id : { eq : '123', size : { lt : 1 } },
        }
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND LENGTH (id) < '1')");
    });

    it(`should work on size: le: operator`, () => {
        const filter = {
            id : { eq : '123', size : { le : 1 } },
        }
    expect(toRDSQueryExpression(filter)).toEqual("(id = '123' AND LENGTH (id) <= '1')");
    });

    it(`should work on size: eq: operator along with and: QueryGroup`, () => {
        const filter = {
            and : [
                { id : { eq : '123', size : { eq : 1 } } },
            ],
        }
        expect(toRDSQueryExpression(filter)).toEqual("((id = '123' AND LENGTH (id) = '1'))");
    });

    it(`should work on size: eq: operator along with or: QueryGroup`, () => {
        const filter = {
            or : [
                { id : { eq : '123', size : { eq : 2 } } },
            ],
            and : [
                { age : { eq : '30', size : { eq : 3 } } },
            ],
        }
        expect(toRDSQueryExpression(filter)).toEqual("((id = '123' AND LENGTH (id) = '2') AND (age = '30' AND LENGTH (age) = '3'))");
    });

    it(`should work on size: eq: operator along with or: and: QueryGroup`, () => {
        const filter = {
            or : [
                { id : { eq : '123', size : { eq : 2 } } },
                { and : [
                    { age : { eq : '30', size : { eq : 3 } } },
                ]},
            ],
            and : [
                { age : { eq : '20', size : { eq : 3 } } },
                { org: { eq : 'AWS', size : { eq : 3 } } },
            ],
        }
        expect(toRDSQueryExpression(filter)).toEqual("((id = '123' AND LENGTH (id) = '2') OR ((age = '30' AND LENGTH (age) = '3')) AND (age = '20' AND LENGTH (age) = '3') AND (org = 'AWS' AND LENGTH (org) = '3'))");
    });
});