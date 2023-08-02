import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';

describe('generated resource access', () => {
  it('provides the generated graphql api and schema as L1 constructs', () => {
    const stack = new cdk.Stack();
    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `,
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
    });
    expect(api.resources.cfnGraphqlApi).toBeDefined();
    expect(api.resources.cfnGraphqlSchema).toBeDefined();
    expect(api.resources.cfnApiKey).not.toBeDefined();
  });

  it('provides the generated api key as an L1 if defined', () => {
    const stack = new cdk.Stack();
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `,
      authorizationConfig: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });
    expect(api.resources.cfnApiKey).toBeDefined();
  });

  it('returns generated tables in resources as L1 constructs', () => {
    const stack = new cdk.Stack();
    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }

        type Post @model @auth(rules: [{ allow: owner }]) {
          title: String!
          authors: [Author] @manyToMany(relationName: "PostAuthors")
        }

        type Author @model @auth(rules: [{ allow: owner }]) {
          title: String!
          posts: [Post] @manyToMany(relationName: "PostAuthors")
        }
      `,
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
    });

    expect(Object.values(api.resources.cfnTables).length).toEqual(4);
    expect(api.resources.cfnTables.Todo).toBeDefined();
    expect(api.resources.cfnTables.Post).toBeDefined();
    expect(api.resources.cfnTables.Author).toBeDefined();
    expect(api.resources.cfnTables.PostAuthors).toBeDefined();
  });

  it('returns sync tables in resources as L1 construct', () => {
    const stack = new cdk.Stack();
    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `,
      conflictResolution: {
        project: {
          handlerType: 'AUTOMERGE',
          detectionType: 'VERSION',
        },
      },
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
    });

    expect(Object.values(api.resources.cfnTables).length).toEqual(2);
    expect(api.resources.cfnTables.Todo).toBeDefined();
    expect(api.resources.cfnTables.AmplifyDataStore).toBeDefined();
  });
});
