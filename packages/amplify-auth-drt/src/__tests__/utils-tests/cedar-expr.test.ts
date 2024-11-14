import * as fc from 'fast-check';

import {
  cedarExprAttrAccessToJsonExpr,
  cedarExprAndToJsonExpr,
  cedarExprEqToJsonExpr,
  cedarExprLiteralToJsonExpr,
  cedarExprOrToJsonExpr,
  cedarExprToJsonExpr,
  cedarExprValueToJsonExpr,
  isCedarBinaryOperatorWithKey,
  cedarExprVarToJsonExpr,
  CedarExprVarAllowedValue,
  cedarExprHasToJsonExpr,
  cedarExprRecordToJsonExpr,
  cedarExprUnknownToJsonExpr,
} from '../../utils';

describe('Cedar expression utilities', () => {
  describe('isCedarBinaryOperatorWithKey', () => {
    test('empty object', () => {
      expect(isCedarBinaryOperatorWithKey({}, 'foo')).toBeFalsy();
    });

    test('empty keys', () => {
      expect(isCedarBinaryOperatorWithKey({ '': '' }, 'foo')).toBeFalsy();
    });

    test('left but no right', () => {
      expect(isCedarBinaryOperatorWithKey({ foo: { left: 'abc' } }, 'foo')).toBeFalsy();
    });

    test('right but no left', () => {
      expect(isCedarBinaryOperatorWithKey({ foo: { right: 'abc' } }, 'foo')).toBeFalsy();
    });

    test('recognizes correctly shaped objects', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record(
            {
              left: fc.string(),
              right: fc.string(),
            },
            { requiredKeys: ['left', 'right'] },
          ),
          (key, record) => {
            const obj = { [key]: record };
            expect(isCedarBinaryOperatorWithKey(obj, key)).toBeTruthy();
          },
        ),
      );
    });
  });

  describe('cedarExprAndToJsonExpr', () => {
    test('handles booleans', () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (left, right) => {
          expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: { left, right } });
        }),
      );
    });

    test('handles integers', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (left, right) => {
          expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: { left, right } });
        }),
      );
    });

    test('handles floats', () => {
      fc.assert(
        fc.property(fc.float(), fc.float(), (left, right) => {
          expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: { left, right } });
        }),
      );
    });

    test('handles strings', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (left, right) => {
          expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: { left, right } });
        }),
      );
    });

    test('handles records', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.string(), fc.string(), { minKeys: 1 }),
          fc.dictionary(fc.string(), fc.string(), { minKeys: 1 }),
          (left, right) => {
            expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: { left, right } });
          },
        ),
      );
    });
  });

  describe('cedarExprAttrAccessToJsonExpr', () => {
    test('handles simple case', () => {
      expect(
        cedarExprAttrAccessToJsonExpr({
          '.': {
            left: {
              Var: 'context',
            },
            attr: 'something',
          },
        }),
      ).toEqual({
        attr: {
          left: 'context',
          attr: 'something',
        },
      });
    });

    test('handles nested case', () => {
      expect(
        cedarExprAttrAccessToJsonExpr({
          '.': {
            left: {
              '.': {
                left: {
                  Var: 'context',
                },
                attr: 'result',
              },
            },
            attr: 'owner',
          },
        }),
      ).toEqual({
        attr: {
          left: {
            attr: {
              left: 'context',
              attr: 'result',
            },
          },
          attr: 'owner',
        },
      });
    });
  });

  describe('cedarExprEqToJsonExpr', () => {
    test('handles booleans', () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (left, right) => {
          expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
        }),
      );
    });

    test('handles integers', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (left, right) => {
          expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
        }),
      );
    });

    test('handles floats', () => {
      fc.assert(
        fc.property(fc.float(), fc.float(), (left, right) => {
          expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
        }),
      );
    });

    test('handles strings', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (left, right) => {
          expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
        }),
      );
    });

    test('handles records', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.string(), fc.string(), { minKeys: 1 }),
          fc.dictionary(fc.string(), fc.string(), { minKeys: 1 }),
          (left, right) => {
            expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
          },
        ),
      );
    });
  });

  describe('cedarExprHasToJsonExpr', () => {
    test('handles simple case', () => {
      expect(
        cedarExprHasToJsonExpr({
          has: {
            left: {
              Var: 'context',
            },
            attr: 'something',
          },
        }),
      ).toEqual({ has: { left: 'context', attr: 'something' } });
    });

    test('handles nested case', () => {
      expect(
        cedarExprHasToJsonExpr({
          has: {
            left: {
              has: {
                left: {
                  Var: 'context',
                },
                attr: 'result',
              },
            },
            attr: 'owner',
          },
        }),
      ).toEqual({
        has: {
          left: {
            has: {
              left: 'context',
              attr: 'result',
            },
          },
          attr: 'owner',
        },
      });
    });
  });

  describe('cedarExprLiteralToJsonExprLiteral', () => {
    test('handles booleans', () => {
      expect(cedarExprLiteralToJsonExpr(true)).toEqual(true);
      fc.assert(
        fc.property(fc.boolean(), (val) => {
          expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
        }),
      );
    });

    test('handles integers', () => {
      fc.assert(
        fc.property(fc.integer(), (val) => {
          expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
        }),
      );
    });

    test('handles floats', () => {
      fc.assert(
        fc.property(fc.float(), (val) => {
          expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
        }),
      );
    });

    test('handles strings', () => {
      fc.assert(
        fc.property(fc.string(), (val) => {
          expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
        }),
      );
    });
  });

  describe('cedarExprOrToJsonExpr', () => {
    test('handles booleans', () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (left, right) => {
          expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: { left, right } });
        }),
      );
    });

    test('handles integers', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (left, right) => {
          expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: { left, right } });
        }),
      );
    });

    test('handles floats', () => {
      fc.assert(
        fc.property(fc.float(), fc.float(), (left, right) => {
          expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: { left, right } });
        }),
      );
    });

    test('handles strings', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (left, right) => {
          expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: { left, right } });
        }),
      );
    });

    test('handles records', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.string(), fc.string(), { minKeys: 1 }),
          fc.dictionary(fc.string(), fc.string(), { minKeys: 1 }),
          (left, right) => {
            expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: { left, right } });
          },
        ),
      );
    });
  });

  describe('cedarExprRecordToJsonExpr', () => {
    test('handles arbitrary shape', () => {
      fc.assert(
        fc.property(fc.object(), (val) => {
          expect(cedarExprRecordToJsonExpr(val as any)).toEqual(val);
        }),
      );
    });
  });

  describe('cedarExprUnknownToJsonExpr', () => {
    test('recognizes correctly shaped objects', () => {
      fc.assert(
        fc.property(
          fc.record(
            {
              unknown: fc.array(fc.record({ Value: fc.string() }), { maxLength: 1, minLength: 1 }),
            },
            { requiredKeys: ['unknown'] },
          ),
          (record) => {
            expect(cedarExprUnknownToJsonExpr(record as any)).toEqual({
              unknown: record.unknown[0].Value,
            });
          },
        ),
      );
    });
  });

  describe('cedarExprValueToJsonExpr', () => {
    test('handles booleans', () => {
      fc.assert(
        fc.property(fc.boolean(), (val) => {
          expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
        }),
      );
    });

    test('handles integers', () => {
      fc.assert(
        fc.property(fc.integer(), (val) => {
          expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
        }),
      );
    });

    test('handles floats', () => {
      fc.assert(
        fc.property(fc.float(), (val) => {
          expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
        }),
      );
    });

    test('handles strings', () => {
      fc.assert(
        fc.property(fc.string(), (val) => {
          expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
        }),
      );
    });
  });

  describe('cedarExprVarToJsonExpr', () => {
    const allowedValues = ['principal', 'action', 'resource', 'context'];
    test.each(allowedValues)('handles %s', (val) => {
      expect(cedarExprVarToJsonExpr({ Var: val as CedarExprVarAllowedValue })).toEqual(val);
    });
  });

  describe('cedarExprToJsonExpr', () => {
    test('happy path', () => {
      const cedarExpr = cedarResidual.residuals[0].conditions[0].body;
      const actualValue = cedarExprToJsonExpr(cedarExpr);
      console.log(JSON.stringify(actualValue));
      expect(actualValue).toEqual(intermediateRep);
    });
  });
});

const cedarResidual = {
  decision: null,
  residuals: [
    {
      effect: 'permit',
      principal: {
        op: 'All',
      },
      action: {
        op: 'All',
      },
      resource: {
        op: 'All',
      },
      conditions: [
        {
          kind: 'when',
          body: {
            '&&': {
              left: {
                '&&': {
                  left: {
                    Value: true,
                  },
                  right: {
                    is: {
                      left: {
                        unknown: [
                          {
                            Value: 'resource',
                          },
                        ],
                      },
                      entity_type: 'AmplifyApi::TodoOwner',
                    },
                  },
                },
              },
              right: {
                '||': {
                  left: {
                    '||': {
                      left: {
                        '==': {
                          left: {
                            '.': {
                              left: {
                                Var: 'resource',
                              },
                              attr: 'owner',
                            },
                          },
                          right: {
                            '.': {
                              left: {
                                Var: 'principal',
                              },
                              attr: 'subUsername',
                            },
                          },
                        },
                      },
                      right: {
                        '==': {
                          left: {
                            '.': {
                              left: {
                                Var: 'resource',
                              },
                              attr: 'owner',
                            },
                          },
                          right: {
                            '.': {
                              left: {
                                Var: 'principal',
                              },
                              attr: 'sub',
                            },
                          },
                        },
                      },
                    },
                  },
                  right: {
                    '==': {
                      left: {
                        '.': {
                          left: {
                            Var: 'resource',
                          },
                          attr: 'owner',
                        },
                      },
                      right: {
                        '.': {
                          left: {
                            Var: 'principal',
                          },
                          attr: 'username',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      annotations: {
        id: 'permit owners to perform specified operations',
      },
    },
  ],
};

const intermediateRep = {
  and: {
    left: {
      and: {
        left: {
          value: true,
        },
        right: {
          is: {
            left: {
              unknown: [
                {
                  Value: 'resource',
                },
              ],
            },
            entity_type: 'AmplifyApi::TodoOwner',
          },
        },
      },
    },
    right: {
      or: {
        left: {
          or: {
            left: {
              eq: {
                left: {
                  attr: {
                    left: 'resource',
                    attr: 'owner',
                  },
                },
                right: {
                  attr: {
                    left: 'principal',
                    attr: 'subUsername',
                  },
                },
              },
            },
            right: {
              eq: {
                left: {
                  attr: {
                    left: 'resource',
                    attr: 'owner',
                  },
                },
                right: {
                  attr: {
                    left: 'principal',
                    attr: 'sub',
                  },
                },
              },
            },
          },
        },
        right: {
          eq: {
            left: {
              attr: {
                left: 'resource',
                attr: 'owner',
              },
            },
            right: {
              attr: {
                left: 'principal',
                attr: 'username',
              },
            },
          },
        },
      },
    },
  },
};
