import { removeAmplifyInputDefinition } from '../../transformation/utils';

describe('removeAmplifyInputDefinition', () => {
  it('strips input Amplify objects', () => {
    const input = /* GraphQL */ `
      input Amplify { globalAuthRule: AuthRule = { allow: public } }
    
      type Todo {
        id: ID!
        content: String!
      }
    `;
    const expectedOutput = /* GraphQL */ `type Todo {
  id: ID!
  content: String!
}
`;
    expect(removeAmplifyInputDefinition(input)).toEqual(expectedOutput);
  });

  it('does not strip Amplify type objects', () => {
    const input = /* GraphQL */ `
      type Amplify {
        id: ID!
      }
    
      type Todo {
        id: ID!
        content: String!
      }
    `;
    const expectedOutput = /* GraphQL */ `type Amplify {
  id: ID!
}

type Todo {
  id: ID!
  content: String!
}
`;
    expect(removeAmplifyInputDefinition(input)).toEqual(expectedOutput);
  });
});