import { getModelTypeNames } from '../../internal';

describe('model type names', () => {
  it('should return the type names with model directives given a GraphQL SDL schema', () => {
    const schema = /* GraphQL */ `
      type Todo @model {
        id: ID!
        content: String!
      }
      type Author @model {
        id: ID!
        phone: Phone
      }
      type Phone {
        number: String
      }
    `;
    const typeNames = getModelTypeNames(schema);
    expect(typeNames).toEqual(['Todo', 'Author']);
  });
});
