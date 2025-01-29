import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { parse } from 'graphql';
import { HttpTransformer } from '..';

describe('@http directive on extended types', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [{ authenticationType: 'AWS_IAM' }],
  };

  test.each(['Query', 'Mutation', 'Subscription'])('supports @http directive on fields of %s type extensions', (builtInType: string) => {
    const schema = /* GraphQL */ `
      type ${builtInType} {
        customOperation1: String! @http(url: "https://www.api.com/foo1")
      }

      extend type ${builtInType} {
        customOperation2: String! @http(url: "https://www.api.com/foo2")
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new HttpTransformer()],
    };

    const out = testTransform(testTransformParams);
    expect(out).toBeDefined();
    expect(out.resolvers).toMatchSnapshot();
    expect(out.pipelineFunctions).toMatchSnapshot();
    parse(out.schema);
  });

  test.each(['Query', 'Mutation'])('does not support @http directive on %s object extension itself', (builtInType: string) => {
    const schema = /* GraphQL */ `
        type ${builtInType} {
          customOperation1: String! @http(url: "https://www.api.com/foo1")
        }

        extend type ${builtInType} @http(url: "https://www.api.com/foo2") {
          customOperation2: String! 
        }
      `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new HttpTransformer()],
    };

    // The GraphQL parser actually catches this case, but we'll leave it here for completeness
    expect(() => testTransform(testTransformParams)).toThrow('Directive "@http" may not be used on OBJECT.');
  });

  test('does not support @http directive on fields of non-model type extensions', () => {
    const schema = /* GraphQL */ `
      type Foo {
        customField1: String! @http(url: "https://www.api.com/foo1")
      }

      extend type Foo {
        customField2: String! @http(url: "https://www.api.com/foo2")
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new HttpTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow(
      "The '@http' directive cannot be used on fields of type extensions other than 'Query', 'Mutation', and 'Subscription'. See Foo.customField2",
    );
  });
});
