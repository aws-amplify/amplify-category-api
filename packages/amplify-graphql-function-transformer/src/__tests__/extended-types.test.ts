import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { FunctionTransformer } from '..';

describe('@function directive on extended types', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [{ authenticationType: 'AWS_IAM' }],
  };

  test.each(['Query', 'Mutation', 'Subscription'])(
    'supports @function directive on fields of %s type extensions',
    (builtInType: string) => {
      const schema = /* GraphQL */ `
      type ${builtInType} {
        customOperation1: String! @function(name: "foo1")
      }

      extend type ${builtInType} {
        customOperation2: String! @function(name: "foo2")
      }
    `;

      const testTransformParams = {
        schema: schema,
        authConfig,
        transformers: [new FunctionTransformer()],
      };

      const out = testTransform(testTransformParams);
      expect(out).toBeDefined();

      expect(out.resolvers['InvokeFoo1LambdaDataSource.req.vtl']).toBeDefined();
      expect(out.resolvers['InvokeFoo2LambdaDataSource.req.vtl']).toBeDefined();
    },
  );

  test.each(['Query', 'Mutation', 'Subscription'])(
    'does not support @function directive on %s object extension itself',
    (builtInType: string) => {
      const schema = /* GraphQL */ `
        type ${builtInType} {
          customOperation1: String! @function(name: "foo")
        }

        extend type ${builtInType} @function(name: "foo") {
          customOperation2: String! 
        }
      `;

      const testTransformParams = {
        schema: schema,
        authConfig,
        transformers: [new FunctionTransformer()],
      };

      // The GraphQL parser actually catches this case, but we'll leave it here for completeness
      expect(() => testTransform(testTransformParams)).toThrow('Directive "@function" may not be used on OBJECT.');
    },
  );

  test('does not support @function directive on fields of non-model type extensions', () => {
    const schema = /* GraphQL */ `
      type Foo {
        customField1: String! @function(name: "foo")
      }

      extend type Foo {
        customField2: String! @function(name: "foo")
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new FunctionTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow(
      "The '@function' directive cannot be used on fields of type extensions other than 'Query', 'Mutation', and 'Subscription'. See Foo.customField2",
    );
  });
});
