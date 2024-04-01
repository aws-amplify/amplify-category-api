import {
  AppSyncAuthConfiguration,
  NestedStackProvider,
  TransformParameters,
  TransformerPluginProvider,
  TransformerPluginType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GraphQLApi } from '../../graphql-api';
import { GraphQLTransform } from '../../transformation/transform';
import { TransformerOutput } from '../../transformer-context/output';
import { StackManager } from '../../transformer-context/stack-manager';
import { AssetManager } from '../../transformer-context/asset-manager';

class TestGraphQLTransform extends GraphQLTransform {
  testGenerateGraphQlApi(stackManager: StackManager, assetManager: AssetManager, output: TransformerOutput): GraphQLApi {
    return this.generateGraphQlApi(
      stackManager,
      assetManager,
      {
        amplifyEnvironmentName: 'NONE',
        apiName: 'testApi',
      },
      output,
      { enableTransformerCfnOutputs: true } as TransformParameters,
    );
  }
}

const testNestedStackProvider: NestedStackProvider = {
  provide: (scope: Construct, name: string): Stack => new NestedStack(scope, name),
};

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
      const app = new App();
      const stack = new Stack(app, 'TestStack');
      const stackManager = new StackManager(stack, testNestedStackProvider, undefined, {});
      const assetManager = new AssetManager();
      const transformerOutput = {
        buildSchema: jest.fn(() => ''),
      } as unknown as TransformerOutput;
      transform.testGenerateGraphQlApi(stackManager, assetManager, transformerOutput);
      if (isAPIKeyExpected) {
        expect(stackManager.scope.node.tryFindChild('GraphQLAPIKeyOutput')).toBeDefined();
      } else {
        expect(stackManager.scope.node.tryFindChild('GraphQLAPIKeyOutput')).toBeUndefined();
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
      const app = new App();
      const stack = new Stack(app, 'TestStack');
      const stackManager = new StackManager(stack, testNestedStackProvider, undefined, {});
      const assetManager = new AssetManager();
      const transformerOutput = {
        buildSchema: jest.fn(() => ''),
      } as unknown as TransformerOutput;
      transform.testGenerateGraphQlApi(stackManager, assetManager, transformerOutput);
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
