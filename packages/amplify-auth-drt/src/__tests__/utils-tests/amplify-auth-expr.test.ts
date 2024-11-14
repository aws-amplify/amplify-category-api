import * as fc from 'fast-check';
import { amplifyAuthExprAndToJsonExpr, amplifyAuthExprEqToJsonExpr, amplifyAuthExprOrToJsonExpr, AmplifyAuthFilterExpr } from '../../utils';

describe('Cedar expression utilities', () => {
  describe('amplifyAuthExprAndToJsonExpr', () => {
    test('handles simple case', () => {
      fc.assert(
        // We're hardcoding the length of the tuple array so we can manually construct the expected value, rather than using some variation
        // on the implementation logic
        fc.property(fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 2, maxLength: 2 }), (keyValuePairs) => {
          const conditions = keyValuePairs.reduce((acc, curr) => {
            return [
              ...acc,
              {
                [curr[0]]: {
                  eq: curr[1],
                },
              },
            ];
          }, [] as AmplifyAuthFilterExpr[]);

          const expr = {
            and: conditions,
          };

          const expected = {
            and: {
              left: {
                eq: {
                  left: keyValuePairs[0][0],
                  right: keyValuePairs[0][1],
                },
              },
              right: {
                eq: {
                  left: keyValuePairs[1][0],
                  right: keyValuePairs[1][1],
                },
              },
            },
          };
          expect(amplifyAuthExprAndToJsonExpr(expr)).toEqual(expected);
        }),
      );
    });

    test('handles nested case', () => {
      fc.assert(
        // We're hardcoding the length of the tuple array so we can manually construct the expected value, rather than using some variation
        // on the implementation logic
        fc.property(fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 3, maxLength: 3 }), (keyValuePairs) => {
          const conditions = keyValuePairs.reduce((acc, curr) => {
            return [
              ...acc,
              {
                [curr[0]]: {
                  eq: curr[1],
                },
              },
            ];
          }, [] as AmplifyAuthFilterExpr[]);

          const expr = {
            and: conditions,
          };

          const expected = {
            and: {
              left: {
                eq: {
                  left: keyValuePairs[0][0],
                  right: keyValuePairs[0][1],
                },
              },
              right: {
                and: {
                  left: {
                    eq: {
                      left: keyValuePairs[1][0],
                      right: keyValuePairs[1][1],
                    },
                  },
                  right: {
                    eq: {
                      left: keyValuePairs[2][0],
                      right: keyValuePairs[2][1],
                    },
                  },
                },
              },
            },
          };
          expect(amplifyAuthExprAndToJsonExpr(expr)).toEqual(expected);
        }),
      );
    });
  });

  describe('amplifyAuthExprOrToJsonExpr', () => {
    test('handles simple case', () => {
      fc.assert(
        // We're hardcoding the length of the tuple array so we can manually construct the expected value, rather than using some variation
        // on the implementation logic
        fc.property(fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 2, maxLength: 2 }), (keyValuePairs) => {
          const conditions = keyValuePairs.reduce((acc, curr) => {
            return [
              ...acc,
              {
                [curr[0]]: {
                  eq: curr[1],
                },
              },
            ];
          }, [] as AmplifyAuthFilterExpr[]);

          const expr = {
            or: conditions,
          };

          const expected = {
            or: {
              left: {
                eq: {
                  left: keyValuePairs[0][0],
                  right: keyValuePairs[0][1],
                },
              },
              right: {
                eq: {
                  left: keyValuePairs[1][0],
                  right: keyValuePairs[1][1],
                },
              },
            },
          };
          expect(amplifyAuthExprOrToJsonExpr(expr)).toEqual(expected);
        }),
      );
    });

    test('handles nested case', () => {
      fc.assert(
        // We're hardcoding the length of the tuple array so we can manually construct the expected value, rather than using some variation
        // on the implementation logic
        fc.property(fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 3, maxLength: 3 }), (keyValuePairs) => {
          const conditions = keyValuePairs.reduce((acc, curr) => {
            return [
              ...acc,
              {
                [curr[0]]: {
                  eq: curr[1],
                },
              },
            ];
          }, [] as AmplifyAuthFilterExpr[]);

          const expr = {
            or: conditions,
          };

          const expected = {
            or: {
              left: {
                eq: {
                  left: keyValuePairs[0][0],
                  right: keyValuePairs[0][1],
                },
              },
              right: {
                or: {
                  left: {
                    eq: {
                      left: keyValuePairs[1][0],
                      right: keyValuePairs[1][1],
                    },
                  },
                  right: {
                    eq: {
                      left: keyValuePairs[2][0],
                      right: keyValuePairs[2][1],
                    },
                  },
                },
              },
            },
          };
          expect(amplifyAuthExprOrToJsonExpr(expr)).toEqual(expected);
        }),
      );
    });
  });

  describe('amplifyAuthExprEqToJsonExpr', () => {
    test('handles basic case', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, value) => {
          const expr = {
            [key]: {
              eq: value,
            },
          };
          expect(amplifyAuthExprEqToJsonExpr(expr)).toEqual({
            eq: {
              left: key,
              right: value,
            },
          });
        }),
      );
    });
  });
});
