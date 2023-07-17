import { AppSyncAuthConfiguration, TransformerLogLevel, TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  constructTransformerChain,
  constructTransform,
  executeTransform,
  TransformConfig,
  defaultPrintTransformerLog,
} from '../graphql-transformer';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { TransformerLog } from '@aws-amplify/graphql-transformer-interfaces/src';

describe('constructTransformerChain', () => {
  it('returns 14 transformers when no custom transformers are provided', () => {
    expect(constructTransformerChain().length).toEqual(14);
  });

  it('returns 16 transformers when 2 custom transformers are provided', () => {
    expect(
      constructTransformerChain({
        customTransformers: [{} as unknown as TransformerPluginProvider, {} as unknown as TransformerPluginProvider],
      }).length,
    ).toEqual(16);
  });

  it('succeeds on admin roles', () => {
    expect(
      constructTransformerChain({
        adminRoles: ['testRole'],
      }).length,
    ).toEqual(14);
  });
});

const defaultTransformConfig: TransformConfig = {
  transformersFactoryArgs: {},
  transformParameters: {
    shouldDeepMergeDirectiveConfigDefaults: false,
    disableResolverDeduping: false,
    sandboxModeEnabled: false,
    useSubUsernameForDefaultIdentityClaim: false,
    populateOwnerFieldForStaticGroupAuth: false,
    suppressApiKeyGeneration: false,
    secondaryKeyAsGSI: false,
    enableAutoIndexQueryNames: false,
    respectPrimaryKeyAttributesOnConnectionField: false,
    enableSearchNodeToNodeEncryption: false,
  },
};

describe('constructTransform', () => {
  it('returns a graphql transform', () => {
    const transform = constructTransform(defaultTransformConfig);
    expect(transform).toBeDefined();
    expect(transform).toBeInstanceOf(GraphQLTransform);
  });
});

describe('executeTransform', () => {
  it('executes a transform', () => {
    expect(
      executeTransform({
        ...defaultTransformConfig,
        schema: /* GraphQL */ `
          type Todo @model {
            content: String!
          }
        `,
      }),
    ).toBeDefined();
  });

  it('writes logs to provided printer', () => {
    const userPoolAuthConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: {
          userPoolId: 'myUserPool',
        },
      },
      additionalAuthenticationProviders: [],
    };
    let didLog = false;
    executeTransform({
      ...defaultTransformConfig,
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          content: String!
        }
      `,
      transformersFactoryArgs: { authConfig: userPoolAuthConfig },
      authConfig: userPoolAuthConfig,
      printTransformerLog: (): void => {
        didLog = true;
      },
    });
    expect(didLog).toEqual(true);
  });

  it('does not log warnings on simple schema', () => {
    executeTransform({
      ...defaultTransformConfig,
      schema: /* GraphQL */ `
        type Todo @model {
          content: String!
        }
      `,
      printTransformerLog: ({ message }: TransformerLog): void => {
        throw new Error(`Transformer logging not expected, received ${message}`);
      },
    });
  });
});

describe('defaultPrintTransformerLog', () => {
  it('writes error messages', () => {
    const error = jest.spyOn(console, 'error');
    defaultPrintTransformerLog({ message: 'test error message', level: TransformerLogLevel.ERROR });
    expect(error).toHaveBeenCalledWith('test error message');
  });

  it('writes warning messages', () => {
    const warn = jest.spyOn(console, 'warn');
    defaultPrintTransformerLog({ message: 'test warn message', level: TransformerLogLevel.WARN });
    expect(warn).toHaveBeenCalledWith('test warn message');
  });

  it('writes info messages', () => {
    const info = jest.spyOn(console, 'info');
    defaultPrintTransformerLog({ message: 'test info message', level: TransformerLogLevel.INFO });
    expect(info).toHaveBeenCalledWith('test info message');
  });

  it('writes debug message', () => {
    const debug = jest.spyOn(console, 'debug');
    defaultPrintTransformerLog({ message: 'test debug message', level: TransformerLogLevel.DEBUG });
    expect(debug).toHaveBeenCalledWith('test debug message');
  });

  it('writes unexpected log levels to error', () => {
    const error = jest.spyOn(console, 'error');
    defaultPrintTransformerLog({ message: 'unexpected message', level: 'bad' as TransformerLogLevel });
    expect(error).toHaveBeenCalledWith('unexpected message');
  });
});
