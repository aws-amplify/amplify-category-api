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

          // NOTE: We convert left values of `and`, `or`, and `eq` expressions to be attribute accessors of a resource, since for our tests
          // they're always used in evaluating resource conditions
          expect(amplifyAuthExprAndToJsonExpr(expr)).toEqual({
            and: [
              {
                eq: {
                  left: { attr: { left: { var: 'resource' }, attr: keyValuePairs[0][0] } },
                  right: keyValuePairs[0][1],
                },
              },
              {
                eq: {
                  left: { attr: { left: { var: 'resource' }, attr: keyValuePairs[1][0] } },
                  right: keyValuePairs[1][1],
                },
              },
            ],
          });
        }),
        { seed: -1266890402, path: '0:0:0:0', endOnFailure: true },
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

          // NOTE: We convert left values of `and`, `or`, and `eq` expressions to be attribute accessors of a resource, since for our tests
          // they're always used in evaluating resource conditions
          const expected = {
            or: [
              {
                eq: {
                  left: { attr: { left: { var: 'resource' }, attr: keyValuePairs[0][0] } },
                  right: keyValuePairs[0][1],
                },
              },
              {
                eq: {
                  left: { attr: { left: { var: 'resource' }, attr: keyValuePairs[1][0] } },
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

          // NOTE: We convert left values of `and`, `or`, and `eq` expressions to be attribute accessors of a resource, since for our tests
          // they're always used in evaluating resource conditions
          expect(amplifyAuthExprEqToJsonExpr(expr)).toEqual({
            eq: {
              left: { attr: { left: { var: 'resource' }, attr: key } },
              right: value,
            },
          });
        }),
      );
    });
  });
});
