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
      type Post @model {
        id: ID!
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }

      type Tag @model {
        id: ID!
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const typeNames = getModelTypeNames(schema);
    expect(typeNames).toEqual(['Todo', 'Author', 'Post', 'Tag', 'PostTags']);
  });
});
