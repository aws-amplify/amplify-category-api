import * as allAmplifyGraphqlApiExports from '@aws-amplify/graphql-api-construct';
import * as allAmplifyDataExports from '..';

describe('exports', () => {
  it('@aws-amplify/data-construct exports match @aws-amplify/graphql-api-construct exports', () => {
    // remove exports that differ
    const { AmplifyData, AmplifyDataDefinition, ...amplifyDataExports } = allAmplifyDataExports;
    const { AmplifyGraphqlApi, AmplifyGraphqlDefinition, ...amplifyGraphqlApiExports } = allAmplifyGraphqlApiExports;
    expect(amplifyDataExports).toEqual(amplifyGraphqlApiExports);
  });
});
