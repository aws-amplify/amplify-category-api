import { $TSAny } from 'amplify-cli-core';
import { AppSyncAuthConfiguration, TransformerPluginProvider, TransformerPluginType } from '@aws-amplify/graphql-transformer-interfaces';
import { App } from '@aws-cdk/core';
import { GraphQLApi } from '../../graphql-api';
import { GraphQLTransform } from '../../transformation/transform';
import { TransformerOutput } from '../../transformer-context/output';
import { StackManager } from '../../transformer-context/stack-manager';
import { TransformerContext } from '../../transformer-context';
import { printer } from 'amplify-prompts';

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

const printerMock = printer as jest.Mocked<typeof printer>;
printerMock.info = jest.fn();

const mockContext = {
  isProjectUsingDataStore: jest.fn(),
  featureFlags: {
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    getObject: jest.fn(),
  },
  isProjectUsingCPK: jest.fn(),
} as $TSAny as TransformerContext;

describe('GraphQLTransform', () => {
  const CPK_ERROR_MESSAGE = expect.stringContaining(
    `
⚠️  WARNING: Your schema has a custom primary key but the Feature Flag \"respectPrimaryKeyAttributesOnConnectionField\" is disabled. Check the value in your "amplify/cli.json" file, change it to "true" and re-run
`,
  );

  it('has isProjectUsingCPK which returns true if a model has a primary key', () => {
    const transform = new GraphQLTransform({
      transformers: [mockTransformer],
    });
    const schema = `  
    type Post @model {  
      id: ID! @primaryKey
      title: String!
    `;
    const ctx: TransformerContext = mockContext;
        
  });

  it('throws on construction with no transformers', () => {
    expect(() => {
      // eslint-disable-next-line no-new
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

  it(`throws a cpk warning when datastore exists and FF is false but primary key exists`, () => {
    const transform = new GraphQLTransform({
      transformers: [mockTransformer],
    });
    mockContext.isProjectUsingDataStore = jest.fn().mockReturnValueOnce(true);
    mockContext.featureFlags.getBoolean = jest.fn().mockReturnValueOnce(false);
    mockContext.isProjectUsingCPK = jest.fn().mockReturnValueOnce(true);
    transform.validateCPKFeatureFlag(mockContext)
    expect(printerMock.info).toBeCalledWith(
      `
⚠️  WARNING: Your schema has a custom primary key but the Feature Flag \"respectPrimaryKeyAttributesOnConnectionField\" is disabled. Check the value in your "amplify/cli.json" file, change it to "true" and re-run
  `,
      'yellow',
    );
  });

  it(`doesn't throw a cpk warning when datastore exists and FF is true and also primary key exists`, () => {
    const transform = new GraphQLTransform({
      transformers: [mockTransformer],
    });
    mockContext.isProjectUsingDataStore = jest.fn().mockReturnValueOnce(true);
    mockContext.featureFlags.getBoolean = jest.fn().mockReturnValueOnce(true);
    mockContext.isProjectUsingCPK = jest.fn().mockReturnValueOnce(true);
    transform.validateCPKFeatureFlag(mockContext);
    expect(printerMock.info).not.toBeCalledWith(CPK_ERROR_MESSAGE);
  });

  it(`doesn't throw a cpk warning when datastore doesn't exist and FF is false and also primary key exists`, () => {
    const transform = new GraphQLTransform({
      transformers: [mockTransformer],
    });
    mockContext.isProjectUsingDataStore = jest.fn().mockReturnValueOnce(false);
    mockContext.featureFlags.getBoolean = jest.fn().mockReturnValueOnce(false);
    mockContext.isProjectUsingCPK = jest.fn().mockReturnValueOnce(true);
    transform.validateCPKFeatureFlag(mockContext);
    expect(printerMock.info).not.toBeCalledWith(CPK_ERROR_MESSAGE);
  });

  it(`doesn't throw a cpk warning when primary key doesn't exists`, () => {
    const transform = new GraphQLTransform({
      transformers: [mockTransformer],
    });
    mockContext.isProjectUsingDataStore = jest.fn().mockReturnValueOnce(true);
    mockContext.featureFlags.getBoolean = jest.fn().mockReturnValueOnce(false);
    mockContext.isProjectUsingCPK = jest.fn().mockReturnValueOnce(false);
    transform.validateCPKFeatureFlag(mockContext);
    expect(printerMock.info).not.toBeCalledWith(CPK_ERROR_MESSAGE);
  });

  describe('generateGraphQlApi', () => {
    const invokeAndVerifyIfAPIKeyIsDefined = (
      { transform, isAPIKeyExpected }: { transform: TestGraphQLTransform, isAPIKeyExpected: boolean },
    ): void => {
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

    it('creates an api key for apps with API_KEY authorization if CreateApiKey is set to 1', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
        buildParameters: { CreateAPIKey: 1 },
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: true });
    });

    it('does not create an api key for apps with API_KEY authorization if CreateApiKey is set to 0', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
        buildParameters: { CreateAPIKey: 0 },
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: false });
    });

    it('does not create an api key for apps with API_KEY authorization if CreateApiKey is set to -1', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
        buildParameters: { CreateAPIKey: -1 },
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: false });
    });

    it('does not create an api key for apps with API_KEY authorization if CreateApiKey is set to an empty string', () => {
      const transform = new TestGraphQLTransform({
        transformers: [mockTransformer],
        authConfig: apiKeyAuthConfig,
        buildParameters: { CreateAPIKey: '' },
      });
      invokeAndVerifyIfAPIKeyIsDefined({ transform, isAPIKeyExpected: false });
    });
  });
});
