import { checkForUnsupportedDirectives } from '../../../../provider-utils/awscloudformation/utils/rds-resources/utils';

describe('check for unsupported RDS directives', () => {
  const modelToDatasourceMap = new Map();
  modelToDatasourceMap.set('Post', { dbType: 'MySQL' });
  modelToDatasourceMap.set('Tag', { dbType: 'DDB' });

  it('should throw error if auth directive is present on a model', () => {
    const schema = `
            type Post @model @auth(rules: [{allow: owner}]) {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @auth  belonging to a type Post is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
  });

  it('should throw error if auth directive is present on a field', () => {
    const schema = `
            type Post @model {
                id: ID!
                title: String! @auth(rules: [{allow: owner}])
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @auth on field title belonging to a type Post is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
  });

  it('should throw error if searchable directive is present on a model', () => {
    const schema = `
            type Post @model @searchable {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @searchable  belonging to a type Post is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
  });

  it('should throw error if predictions directive is present on a query type field', () => {
    const schema = `
            type Query {
                recognizeTextFromImage: String @predictions(actions: [identifyText])
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @predictions on field recognizeTextFromImage belonging to a type Query is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
  });

  it('should throw error if function directive is present on a field', () => {
    const schema = `
            type Query {
                echo(msg: String): String @function(name: "echofunction")
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @function on field echo belonging to a type Query is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
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
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @manyToMany on field tags belonging to a type Post is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
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
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @http on field listPosts belonging to a type Query is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
  });

  it('should throw error if mapsTo directive is present on a model', () => {
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).toThrowErrorMatchingInlineSnapshot(
      `"Directive @mapsTo  belonging to a type Post is not supported on RDS datasource backed types. Following directives are not supported on RDS datasource backed types: auth, searchable, predictions, function, manyToMany, http, mapsTo"`,
    );
  });

  it('should not throw error if there are only DDB models', () => {
    const modelToDatasourceMap = new Map();
    modelToDatasourceMap.set('Post', { dbType: 'DDB' });
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).not.toThrowError();
  });

  it('early return if model_to_datasource map is empty or undefined', () => {
    const modelToDatasourceMap = new Map();
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).not.toThrowError();
  });

  it('early return if schema is empty or undefined', () => {
    const modelToDatasourceMap = new Map();
    modelToDatasourceMap.set('Post', { dbType: 'MySQL' });
    const schema = '';
    expect(() => checkForUnsupportedDirectives(schema, modelToDatasourceMap)).not.toThrowError();
  });
});
