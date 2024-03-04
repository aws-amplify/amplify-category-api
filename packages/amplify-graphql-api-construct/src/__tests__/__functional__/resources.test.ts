import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('generated resource access', () => {
  describe('l1 resources', () => {
    describe('singleton appsync resources', () => {
      it('provides the generated graphql api and schema as L1 constructs', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const {
          resources: {
            cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: owner }]) {
              description: String!
            }
          `),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        expect(cfnGraphqlApi).toBeDefined();
        expect(cfnGraphqlSchema).toBeDefined();
        expect(cfnApiKey).not.toBeDefined();
      });

      it('provides the generated api key as an L1 if defined', () => {
        const {
          resources: {
            cfnResources: { cfnApiKey },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(cfnApiKey).toBeDefined();
      });
    });

    describe('appsync resolvers', () => {
      it('returns resolvers for models', () => {
        const {
          resources: {
            cfnResources: { cfnResolvers },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnResolvers).length).toEqual(8);
        expect(cfnResolvers['Query.getTodo']).toBeDefined();
        expect(cfnResolvers['Query.listTodos']).toBeDefined();
        expect(cfnResolvers['Mutation.createTodo']).toBeDefined();
        expect(cfnResolvers['Mutation.updateTodo']).toBeDefined();
        expect(cfnResolvers['Mutation.deleteTodo']).toBeDefined();
        expect(cfnResolvers['Subscription.onCreateTodo']).toBeDefined();
        expect(cfnResolvers['Subscription.onUpdateTodo']).toBeDefined();
        expect(cfnResolvers['Subscription.onDeleteTodo']).toBeDefined();
      });

      it('returns resolvers for searchable', () => {
        const {
          resources: {
            cfnResources: { cfnResolvers },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) @searchable {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnResolvers).length).toEqual(9); // 8 for model + 1 for searchable
        expect(cfnResolvers['Query.searchTodos']).toBeDefined();
      });

      it('returns resolvers for index', () => {
        const {
          resources: {
            cfnResources: { cfnResolvers },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String! @index
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnResolvers).length).toEqual(9); // 8 for model + 1 for index
        expect(cfnResolvers['Query.todosByDescription']).toBeDefined();
      });

      it('returns resolvers for relationships', () => {
        const {
          resources: {
            cfnResources: { cfnResolvers },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
              authors: [Author] @hasMany
              topic: Topic @hasOne
            }

            type Author @model @auth(rules: [{ allow: public }]) {
              name: String!
              bylines: [Byline] @manyToMany(relationName: "AuthorBylines")
            }

            type Byline @model @auth(rules: [{ allow: public }]) {
              name: String!
              authors: [Author] @manyToMany(relationName: "AuthorBylines")
            }

            type Topic @model @auth(rules: [{ allow: public }]) {
              name: String!
              todo: Todo @belongsTo
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        // 8 x 5 for 4 models and 1 joinModel
        // 1 for hasMany
        // 1 for hasOne
        // 1 for belongsTo
        // 6 for manyToMany (4 for field resolvers, 2 for indexes)
        expect(Object.values(cfnResolvers).length).toEqual(49);

        // Join Table auto-gen should exist
        expect(cfnResolvers['Mutation.createAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Mutation.updateAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Mutation.deleteAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Query.getAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Query.listAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Subscription.onCreateAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Subscription.onDeleteAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Subscription.onUpdateAuthorBylines']).toBeDefined();
        expect(cfnResolvers['Query.authorBylinesByAuthorId']).toBeDefined(); // @manyToMany implicit index
        expect(cfnResolvers['Query.authorBylinesByBylineId']).toBeDefined(); // @manyToMany implicit index

        // Relational field resolvers should exist
        expect(cfnResolvers['Todo.authors']).toBeDefined(); // @hasMany
        expect(cfnResolvers['Todo.topic']).toBeDefined(); // @hasOne
        expect(cfnResolvers['Topic.todo']).toBeDefined(); // @belongsTo
        expect(cfnResolvers['Author.bylines']).toBeDefined(); // @manyToMany source table
        expect(cfnResolvers['Byline.authors']).toBeDefined(); // @manyToMany source table
        expect(cfnResolvers['AuthorBylines.author']).toBeDefined(); // @manyToMany join table
        expect(cfnResolvers['AuthorBylines.byline']).toBeDefined(); // @manyToMany join table
      });
    });

    describe('appsync datasources', () => {
      it('generates a DDB datasource for normal models', () => {
        const {
          resources: {
            cfnResources: { cfnDataSources },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnDataSources).length).toEqual(2); // NONE_DS + model data source
        expect(cfnDataSources.NONE_DS).toBeDefined();
        expect(cfnDataSources.TodoTable).toBeDefined();
      });

      it('generates a search datasource for searchable models', () => {
        const {
          resources: {
            cfnResources: { cfnDataSources },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) @searchable {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnDataSources).length).toEqual(3); // NONE_DS + model data source + search
        expect(cfnDataSources.OpenSearchDataSource).toBeDefined();
      });

      it('generates a lambda datasource for function directive', () => {
        const {
          resources: {
            cfnResources: { cfnDataSources },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Query {
              echo(message: String!): String! @function(name: "echo")
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnDataSources).length).toEqual(1);
        expect(cfnDataSources.EchoLambdaDataSource).toBeDefined();
      });
    });

    describe('appsync functions', () => {
      it('generates functions for models', () => {
        const {
          resources: {
            cfnResources: { cfnFunctionConfigurations },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
          translationBehavior: {
            disableResolverDeduping: false,
          },
        });

        expect(Object.values(cfnFunctionConfigurations).length).toEqual(14);
        expect(cfnFunctionConfigurations.QuerygetTodoauth0Function).toBeDefined();
        expect(cfnFunctionConfigurations.QuerygetTodopostAuth0Function).toBeDefined();
        expect(cfnFunctionConfigurations.QueryGetTodoDataResolverFn).toBeDefined();
        expect(cfnFunctionConfigurations.QueryListTodosDataResolverFn).toBeDefined();
        expect(cfnFunctionConfigurations.MutationcreateTodoinit0Function).toBeDefined();
        expect(cfnFunctionConfigurations.MutationcreateTodoauth0Function).toBeDefined();
        expect(cfnFunctionConfigurations.MutationCreateTodoDataResolverFn).toBeDefined();
        expect(cfnFunctionConfigurations.MutationupdateTodoinit0Function).toBeDefined();
        expect(cfnFunctionConfigurations.MutationupdateTodoauth0Function).toBeDefined();
        expect(cfnFunctionConfigurations.MutationUpdateTodoDataResolverFn).toBeDefined();
        expect(cfnFunctionConfigurations.MutationdeleteTodoauth0Function).toBeDefined();
        expect(cfnFunctionConfigurations.MutationDeleteTodoDataResolverFn).toBeDefined();
        expect(cfnFunctionConfigurations.SubscriptiononCreateTodoauth0Function).toBeDefined();
        expect(cfnFunctionConfigurations.SubscriptionOnCreateTodoDataResolverFn).toBeDefined();
      });
    });

    describe('dynamodb resources', () => {
      it('returns generated tables in resources as L1 constructs', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const {
          resources: {
            cfnResources: { cfnTables },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
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
          `),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        expect(Object.values(cfnTables).length).toEqual(4);
        expect(cfnTables.Todo).toBeDefined();
        expect(cfnTables.Post).toBeDefined();
        expect(cfnTables.Author).toBeDefined();
        expect(cfnTables.PostAuthors).toBeDefined();
      });

      it('returns sync tables in resources as L1 construct', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const {
          resources: {
            cfnResources: { cfnTables },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: owner }]) {
              description: String!
            }
          `),
          conflictResolution: {
            project: {
              handlerType: 'AUTOMERGE',
              detectionType: 'VERSION',
            },
          },
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        expect(Object.values(cfnTables).length).toEqual(2);
        expect(cfnTables.Todo).toBeDefined();
        expect(cfnTables.AmplifyDataStore).toBeDefined();
      });
    });

    describe('default vs amplify-managed tables', () => {
      it('returns a standard CDK-managed table for the default provisioning strategy with global auth', () => {
        const stack = new cdk.Stack();
        const {
          resources: {
            cfnResources: { cfnTables, amplifyDynamoDbTables },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
          translationBehavior: {
            sandboxModeEnabled: true,
          },
        });

        expect(amplifyDynamoDbTables).toMatchObject({});
        expect(amplifyDynamoDbTables.Todo).toBeUndefined();
        expect(Object.values(cfnTables).length).toEqual(1);
        expect(cfnTables.Todo).toBeDefined();
      });

      it('returns a standard CDK-managed table for the default provisioning strategy with owner auth', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const {
          resources: {
            cfnResources: { cfnTables, amplifyDynamoDbTables },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: owner }]) {
              description: String!
            }
          `),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        expect(amplifyDynamoDbTables).toMatchObject({});
        expect(amplifyDynamoDbTables.Todo).toBeUndefined();
        expect(Object.values(cfnTables).length).toEqual(1);
        expect(cfnTables.Todo).toBeDefined();
      });

      it('returns an Amplify-managed table for the Amplify provisioning strategy using owner auth', () => {
        const stack = new cdk.Stack();
        const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
        const {
          resources: {
            cfnResources: { cfnTables, amplifyDynamoDbTables },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(
            /* GraphQL */ `
              type Todo @model @auth(rules: [{ allow: owner }]) {
                description: String!
              }
            `,
            {
              dbType: 'DYNAMODB',
              provisionStrategy: 'AMPLIFY_TABLE',
            },
          ),
          authorizationModes: {
            userPoolConfig: { userPool },
          },
        });

        expect(amplifyDynamoDbTables).toBeDefined();
        expect(amplifyDynamoDbTables.Todo).toBeDefined();
        expect(Object.values(cfnTables).length).toEqual(0);
        expect(cfnTables.Todo).toBeUndefined();
      });

      it('returns an Amplify-managed table for the Amplify provisioning strategy using global auth', () => {
        const stack = new cdk.Stack();
        const {
          resources: {
            cfnResources: { cfnTables, amplifyDynamoDbTables },
          },
        } = new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(
            /* GraphQL */ `
              type Todo @model {
                description: String!
              }
            `,
            {
              dbType: 'DYNAMODB',
              provisionStrategy: 'AMPLIFY_TABLE',
            },
          ),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
          translationBehavior: {
            sandboxModeEnabled: true,
          },
        });

        expect(amplifyDynamoDbTables).toBeDefined();
        expect(amplifyDynamoDbTables.Todo).toBeDefined();
        expect(Object.values(cfnTables).length).toEqual(0);
        expect(cfnTables.Todo).toBeUndefined();
      });
    });

    describe('lambda resources', () => {
      it('generates a lambda function for searchable models', () => {
        const {
          resources: {
            cfnResources: { cfnFunctions },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) @searchable {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnFunctions).length).toEqual(1);
        expect(cfnFunctions.OpenSearchStreamingLambdaFunction).toBeDefined();
      });
    });

    describe('iam resources', () => {
      it('generates roles for normal models', () => {
        const {
          resources: {
            cfnResources: { cfnRoles },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnRoles).length).toEqual(1);
        expect(cfnRoles.TodoIAMRole).toBeDefined();
      });

      it('generates roles for searchable models', () => {
        const {
          resources: {
            cfnResources: { cfnRoles },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) @searchable {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(cfnRoles).length).toEqual(3);
        expect(cfnRoles.TodoIAMRole).toBeDefined();
        expect(cfnRoles.OpenSearchAccessIAMRole).toBeDefined();
        expect(cfnRoles.OpenSearchStreamingLambdaIAMRole).toBeDefined();
      });
    });

    describe('additional resources', () => {
      it('returns the search domain and event stream', () => {
        const {
          resources: {
            cfnResources: { additionalCfnResources },
          },
        } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) @searchable {
              description: String!
            }
          `),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });

        expect(Object.values(additionalCfnResources).length).toEqual(2);
        expect(additionalCfnResources.OpenSearchDomain).toBeDefined();
        expect(additionalCfnResources.SearchableTodoLambdaMapping).toBeDefined();
      });
    });
  });

  describe('l2 resources', () => {
    it('provides a graphql api', () => {
      const {
        resources: { graphqlApi },
      } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      expect(graphqlApi).toBeDefined();
    });

    it('provides tables', () => {
      const {
        resources: { tables },
      } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      expect(Object.values(tables).length).toEqual(1);
      expect(tables.Todo).toBeDefined();
    });

    it('provides roles', () => {
      const {
        resources: { roles },
      } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      expect(Object.values(roles).length).toEqual(1);
      expect(roles.TodoIAMRole).toBeDefined();
    });

    it('provides functions', () => {
      const {
        resources: { functions },
      } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) @searchable {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      expect(Object.values(functions).length).toEqual(1);
      expect(functions.OpenSearchStreamingLambdaFunction).toBeDefined();
    });
  });
});
