import * as fc from 'fast-check';
import { amplifyAuthExprAndToJsonExpr, amplifyAuthExprEqToJsonExpr, amplifyAuthExprOrToJsonExpr, AmplifyAuthFilterExpr } from '../../utils';

describe('Amplify auth expression utilities', () => {
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

          expect(amplifyAuthExprAndToJsonExpr(expr)).toEqual({
            and: [
              {
                eq: {
                  left: keyValuePairs[0][0],
                  right: keyValuePairs[0][1],
                },
              },
              {
                eq: {
                  left: keyValuePairs[1][0],
                  right: keyValuePairs[1][1],
                },
              },
            ],
          });
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

          const expected = {
            or: [
              {
                eq: {
                  left: keyValuePairs[0][0],
                  right: keyValuePairs[0][1],
                },
              },
              {
                eq: {
                  left: keyValuePairs[1][0],
                  right: keyValuePairs[1][1],
                },
              },
            ],
          };

          expect(amplifyAuthExprOrToJsonExpr({ or: conditions })).toEqual(expected);
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
