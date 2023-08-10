import { checkForUnsupportedDirectives } from '../../../../provider-utils/awscloudformation/utils/rds-resources/utils';

describe('check for unsupported RDS directives', () => {
  const modelToDatasourceMap = new Map();
  modelToDatasourceMap.set('Post', { dbType: 'MySQL' });

  it('should throw error if auth directive is present on a model', () => {
    const schema = `
            type Post @model @auth(rules: [{allow: owner}]) {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if auth directive is present on a field', () => {
    const schema = `
            type Post @model {
                id: ID!
                title: String! @auth(rules: [{allow: owner}])
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if searchable directive is present on a model', () => {
    const schema = `
            type Post @model @searchable {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if predictions directive is present on a query type field', () => {
    const schema = `
            type Query {
                recognizeTextFromImage: String @predictions(actions: [identifyText])
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if function directive is present on a field', () => {
    const schema = `
            type Query {
                echo(msg: String): String @function(name: "echofunction")
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if manyToMany directive is present on a field', () => {
    const schema = `
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
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if http directive is present on a field', () => {
    const schema = `
            type Post {
                id: ID!
                title: String
                description: String
                views: Int
            }
            
            type Query {
                listPosts: [Post] @http(url: "https://www.example.com/posts")
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });

  it('should throw error if mapsTo directive is present on a model', () => {
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowError();
  });
});
