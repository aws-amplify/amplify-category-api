/* eslint-disable @typescript-eslint/no-unused-vars */
import * as allAmplifyGraphqlApiExports from '@aws-amplify/graphql-api-construct';
import * as allAmplifyDataExports from '..';

describe('exports', () => {
  it('@aws-amplify/data-construct class and function exports match @aws-amplify/graphql-api-construct exports', () => {
    // remove exports that differ
    const { AmplifyData, AmplifyDataDefinition, ...amplifyDataExports } = allAmplifyDataExports;
    const { AmplifyGraphqlApi, AmplifyGraphqlDefinition, ...amplifyGraphqlApiExports } = allAmplifyGraphqlApiExports;
    expect(amplifyDataExports).toEqual(amplifyGraphqlApiExports);
  });

  /**
   * Types, interfaces, and other non-functional symbols are compiled out of executable code, making a simple 'import * from ...' test
   * unreliable for our purposes.
   *
   * TODO: Make this test work, even if we have to resort to just reading raw files and doing raw text diffs to ensure they're the same.
   */
  it.skip('@aws-amplify/data-construct class, function, type, and interface exports match @aws-amplify/graphql-api-construct exports', () => {});
});
