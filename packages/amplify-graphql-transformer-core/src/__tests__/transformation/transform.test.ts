import { AppSyncAuthConfiguration, TransformerPluginProvider, TransformerPluginType } from '@aws-amplify/graphql-transformer-interfaces';
import { App } from 'aws-cdk-lib';
import { GraphQLApi } from '../../graphql-api';
import { GraphQLTransform } from '../../transformation/transform';
import { TransformerOutput } from '../../transformer-context/output';
import { StackManager } from '../../transformer-context/stack-manager';

class TestGraphQLTransform extends GraphQLTransform {
  testGenerateGraphQlApi(stackManager: StackManager, output: TransformerOutput): GraphQLApi {
    return this.generateGraphQlApi(stackManager, output);
  }
}

const mockTransformer: TransformerPluginProvider = {
  pluginType: TransformerPluginType.DATA_SOURCE_PROVIDER,
  name: '',
  directive: {
    kind: 'DirectiveDefinition',
    name: {
      kind: 'Name',
      value: '',
    },
    repeatable: false,
    locations: [],
  },
  typeDefinitions: [],
};

describe('GraphQLTransform', () => {
  it('throws on construction with no transformers', () => {
    expect(() => {
      new GraphQLTransform({
        transformers: [],
      });
    }).toThrowErrorMatchingInlineSnapshot('"Must provide at least one transformer."');
  });

  it('can be constructed with a single transformer', () => {
    const transform = new GraphQLTransform({
      transformers: [mockTransformer],
    });
    expect(transform).toBeDefined();
  });

  describe('generateGraphQlApi', () => {
    const invokeAndVerifyIfAPIKeyIsDefined = ({
      transform,
      isAPIKeyExpected,
    }: {
      transform: TestGraphQLTransform;
      isAPIKeyExpected: boolean;
    }): void => {
      const stackManager = new StackManager(new App(), {});
      const transformerOutput = {
        buildSchema: jest.fn(() => ''),
      } as unknown as TransformerOutput;
      transform.testGenerateGraphQlApi(stackManager, transformerOutput);
      if (isAPIKeyExpected) {
        expect(stackManager.rootStack.node.tryFindChild('GraphQLAPIKeyOutput')).toBeDefined();
      } else {
        expect(stackManager.rootStack.node.tryFindChild('GraphQLAPIKeyOutput')).toBeUndefined();
      }
    };

    const apiKeyAuthConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
        apiKeyConfig: { apiKeyExpirationDays: 7 },
      },
      additionalAuthenticationProviders: [],
    };

    const iamAuthConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: { authenticationType: 'AWS_IAM' },
      additionalAuthenticationProviders: [],
    };

    it('can be invoked', () => {
      const transform = new TestGraphQLTransform({ transformers: [mockTransformer] });
      const stackManager = new StackManager(new App(), {});
      const transformerOutput = {
        buildSchema: jest.fn(() => ''),
      } as unknown as TransformerOutput;
      transform.testGenerateGraphQlApi(stackManager, transformerOutput);
    });

    it('creates an api key for apps with API_KEY authorization', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: true });
    });

    it('does not create an api key for apps with IAM authorization', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: iamAuthConfig,
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: false });
    });

    it('creates an api key for apps with API_KEY authorization if suppressApiKeyGeneration is set to false', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
        transformParameters: {
          suppressApiKeyGeneration: false,
        },
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: true });
    });

    it('does not create an api key for apps with API_KEY authorization if suppressApiKeyGeneration is set to true', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
        transformParameters: {
          suppressApiKeyGeneration: true,
        },
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: false });
    });
  });
});
