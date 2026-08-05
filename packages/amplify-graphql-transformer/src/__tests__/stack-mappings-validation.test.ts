import * as path from 'path';
import * as os from 'os';
import { AssetProps, TransformerLog } from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as fs from 'fs-extra';
import { executeTransform, TransformConfig } from '../graphql-transformer';

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
    enableSearchEncryptionAtRest: true,
    enableTransformerCfnOutputs: true,
    allowDestructiveGraphqlSchemaUpdates: false,
    replaceTableUponGsiUpdate: false,
    allowGen1Patterns: true,
  },
};

const createAssetProvider = () => {
  const assets = new Map<string, string>();
  const tempAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer-assets'));
  return {
    provide: (scope: Construct, name: string, props: AssetProps) => {
      assets.set(props.fileName, props.fileContent);
      const filePath = path.join(tempAssetDir, props.fileName);
      const fileDirName = path.dirname(filePath);
      if (!fs.existsSync(fileDirName)) {
        fs.mkdirSync(fileDirName, { recursive: true });
      }
      fs.writeFileSync(filePath, props.fileContent);
      return new Asset(scope, name, { path: filePath });
    },
  };
};

describe('stackMappings validation', () => {
  let logs: TransformerLog[];

  beforeEach(() => {
    logs = [];
  });

  const collectLogs = (log: TransformerLog): void => {
    logs.push(log);
  };

  it('warns when stackMappings contains keys that do not match any generated resolver', () => {
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
      assetProvider: createAssetProvider(),
      synthParameters: {
        amplifyEnvironmentName: 'testenv',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      stackMapping: {
        NonExistentResolver: 'MyCustomStack',
      },
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
      printTransformerLog: collectLogs,
    });

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'WARN',
          message: expect.stringMatching(
            /stackMappings contains keys that don't match any generated resolver: \[NonExistentResolver\]\. These keys will be ignored\. You can discover valid resolver names by running/,
          ),
        }),
      ]),
    );
  });

  it('warns listing multiple invalid keys', () => {
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
      assetProvider: createAssetProvider(),
      synthParameters: {
        amplifyEnvironmentName: 'testenv',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      stackMapping: {
        FakeResolver1: 'MyCustomStack',
        FakeResolver2: 'MyCustomStack',
      },
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
      printTransformerLog: collectLogs,
    });

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'WARN',
          message: expect.stringMatching(
            /stackMappings contains keys that don't match any generated resolver: \[.*FakeResolver1.*FakeResolver2.*\]\. These keys will be ignored\. You can discover valid resolver names by running/,
          ),
        }),
      ]),
    );
  });

  it('does not warn when stackMappings contains only valid resolver keys', () => {
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
      assetProvider: createAssetProvider(),
      synthParameters: {
        amplifyEnvironmentName: 'testenv',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      stackMapping: {
        CreateTodoResolver: 'MyCustomStack',
      },
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
      printTransformerLog: collectLogs,
    });

    const warnLogs = logs.filter((log) => log.level === 'WARN');
    expect(warnLogs).toHaveLength(0);
  });

  it('does not warn when stackMappings is empty', () => {
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
      assetProvider: createAssetProvider(),
      synthParameters: {
        amplifyEnvironmentName: 'testenv',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      stackMapping: {},
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
      printTransformerLog: collectLogs,
    });

    const warnLogs = logs.filter((log) => log.level === 'WARN');
    expect(warnLogs).toHaveLength(0);
  });

  it('does not warn when no stackMappings is provided', () => {
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
      assetProvider: createAssetProvider(),
      synthParameters: {
        amplifyEnvironmentName: 'testenv',
        apiName: 'testApi',
      },
      ...defaultTransformConfig,
      schema,
      dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
      printTransformerLog: collectLogs,
    });

    const warnLogs = logs.filter((log) => log.level === 'WARN');
    expect(warnLogs).toHaveLength(0);
  });
});
