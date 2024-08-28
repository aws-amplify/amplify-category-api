import * as path from 'path';
import * as os from 'os';
import {
  AppSyncAuthConfiguration,
  AssetProps,
  TransformerLogLevel,
  TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, GraphQLTransform, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { TransformerLog } from '@aws-amplify/graphql-transformer-interfaces/src';
import { NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as fs from 'fs-extra';
import {
  constructTransformerChain,
  constructTransform,
  executeTransform,
  TransformConfig,
  defaultPrintTransformerLog,
} from '../graphql-transformer';

const numOfTransformers = 17;
describe('constructTransformerChain', () => {
  it(`returns ${numOfTransformers} transformers when no custom transformers are provided`, () => {
    expect(constructTransformerChain().length).toEqual(numOfTransformers);
  });

  it(`returns ${numOfTransformers + 2} transformers when 2 custom transformers are provided`, () => {
    expect(
      constructTransformerChain({
        customTransformers: [{} as unknown as TransformerPluginProvider, {} as unknown as TransformerPluginProvider],
      }).length,
    ).toEqual(numOfTransformers + 2);
  });

  it('succeeds on admin roles', () => {
    expect(constructTransformerChain().length).toEqual(numOfTransformers);
  });
});

const defaultTransformConfig: TransformConfig = {
  transformersFactoryArgs: {},
  transformParameters: {
    shouldDeepMergeDirectiveConfigDefaults: false,
    subscriptionsInheritPrimaryAuth: false,
    disableResolverDeduping: false,
    sandboxModeEnabled: false,
    useSubUsernameForDefaultIdentityClaim: false,
    populateOwnerFieldForStaticGroupAuth: false,
    suppressApiKeyGeneration: false,
    secondaryKeyAsGSI: false,
    enableAutoIndexQueryNames: false,
    respectPrimaryKeyAttributesOnConnectionField: false,
    enableSearchNodeToNodeEncryption: false,
    enableTransformerCfnOutputs: true,
    allowDestructiveGraphqlSchemaUpdates: false,
    replaceTableUponGsiUpdate: false,
    allowGen1Patterns: true,
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
  it('can be invoked', () => {
    const assets = new Map<string, string>();
    const tempAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer-assets'));

    const schema = /* GraphQL */ `
      type Todo @model {
        content: String!
      }
    `;

    executeTransform({
      scope: new Stack(),
      nestedStackProvider: {
        provide: (scope: Construct, name: string) => new NestedStack(scope, name),
      },
      assetProvider: {
        provide: (scope: Construct, name: string, props: AssetProps) => {
          assets.set(props.fileName, props.fileContent);
          const filePath = path.join(tempAssetDir, props.fileName);
          const fileDirName = path.dirname(filePath);
          if (!fs.existsSync(fileDirName)) {
            fs.mkdirSync(fileDirName, { recursive: true });
          }
          fs.writeFileSync(filePath, props.fileContent);
          return new Asset(scope, name, {
            path: filePath,
          });
        },
      },
      synthParameters: {
        amplifyEnvironmentName: 'someval',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
    });
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
    const assets = new Map<string, string>();
    const tempAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer-assets'));
    const schema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: owner }]) {
        content: String!
      }
    `;
    executeTransform({
      scope: new Stack(),
      nestedStackProvider: {
        provide: (nestedStackScope: Construct, name: string) => new NestedStack(nestedStackScope, name),
      },
      assetProvider: {
        provide: (assetScope: Construct, assetId: string, assetProps: AssetProps) => {
          assets.set(assetProps.fileName, assetProps.fileContent);
          const filePath = path.join(tempAssetDir, assetProps.fileName);
          const fileDirName = path.dirname(filePath);
          if (!fs.existsSync(fileDirName)) {
            fs.mkdirSync(fileDirName, { recursive: true });
          }
          fs.writeFileSync(filePath, assetProps.fileContent);
          return new Asset(assetScope, assetId, {
            path: filePath,
          });
        },
      },
      synthParameters: {
        amplifyEnvironmentName: 'testEnv',
        apiName: 'testApi',
        userPoolId: 'testUserPool',
      },
      ...defaultTransformConfig,
      schema,
      authConfig: userPoolAuthConfig,
      printTransformerLog: (): void => {
        didLog = true;
      },
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
    });
    expect(didLog).toEqual(true);
  });

  it('does not log warnings on simple schema', () => {
    const assets = new Map<string, string>();
    const tempAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer-assets'));
    const schema = /* GraphQL */ `
      type Todo @model {
        content: String!
      }
    `;
    executeTransform({
      scope: new Stack(),
      nestedStackProvider: {
        provide: (scope: Construct, name: string) => new NestedStack(scope, name),
      },
      assetProvider: {
        provide: (scope: Construct, name: string, props: AssetProps) => {
          assets.set(props.fileName, props.fileContent);
          const filePath = path.join(tempAssetDir, props.fileName);
          const fileDirName = path.dirname(filePath);
          if (!fs.existsSync(fileDirName)) {
            fs.mkdirSync(fileDirName, { recursive: true });
          }
          fs.writeFileSync(filePath, props.fileContent);
          return new Asset(scope, name, {
            path: filePath,
          });
        },
      },
      synthParameters: {
        amplifyEnvironmentName: 'someval',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
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
