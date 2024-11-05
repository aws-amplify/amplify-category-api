import * as cdk from 'aws-cdk-lib';
import { Annotations } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Ensure that the migration features are marked as experimental.
 * These tests should be removed when migrations are released.
 */

describe('Mark migration features as experimental', () => {
  test('shows warning when using ImportedAmplifyDynamoDbModelDataSourceStrategy', () => {
    const stack = new cdk.Stack();
    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            content: String
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
          tableName: 'ImportedTodoTable',
        },
      ),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi',
      'ImportedAmplifyDynamoDbModelDataSourceStrategy is experimental and is not recommended for production use. This functionality may be changed or removed without warning.',
    );
  });

  test('does not show warning when not using ImportedAmplifyDynamoDbModelDataSourceStrategy', () => {
    const stack = new cdk.Stack();
    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            content: String
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
          tableName: 'ImportedTodoTable',
        },
      ),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi',
      'ImportedAmplifyDynamoDbModelDataSourceStrategy is experimental and is not recommended for production use. This functionality may be changed or removed without warning.',
    );
  });

  test('shows warning when using overrideIndexName', () => {
    const stack = new cdk.Stack();
    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Blog @model {
          comment: Comment @hasOne(references: ["blogId"])
        }

        type Comment @model {
          blogId: ID
          blog: Blog @belongsTo(references: ["blogId"], overrideIndexName: "byBlog")
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      'overrideIndexName argument on @belongsTo is experimental and is not recommended for production use. This functionality may be changed or removed without warning.',
    );
  });

  test('does not show warning when not using overrideIndexName', () => {
    const stack = new cdk.Stack();
    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Blog @model {
          comment: Comment @hasOne(references: ["blogId"])
        }

        type Comment @model {
          blogId: ID
          blog: Blog @belongsTo(references: ["blogId"])
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    Annotations.fromStack(stack).hasNoWarning(
      '/Default/TestApi/GraphQLAPI',
      'overrideIndexName argument on @belongsTo is experimental and is not recommended for production use. This functionality may be changed or removed without warning.',
    );
  });
});
