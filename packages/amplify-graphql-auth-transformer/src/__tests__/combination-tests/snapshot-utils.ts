import {
  ConflictHandlerType,
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  SyncConfig,
  constructDataSourceStrategies,
} from '@aws-amplify/graphql-transformer-core';

import {
  AppSyncAuthConfigurationEntry,
  ModelDataSourceStrategy,
  SQLLambdaModelDataSourceStrategy,
  TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { TestTransformParameters, mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';

/** A utility type to store auth rules to iterate over in combination tests. */
export type TestRules = Record<
  string,
  {
    /**
     * A template for the auth rule. Each template contains an `<EXT>` token that can be used to extend the rule, e.g., with operations. If
     * not overwritten, the `<EXT>` token must be removed or the schema won't parse.
     */
    ruleTemplate: string;

    /**
     * The auth configuration required to support the auth rule.
     */
    auth: AppSyncAuthConfigurationEntry;
  }
>;

/**
 * A default transformer sync configuration that turns on VERSION conflict detection with AUTOMERGE handler, for use in datastore-enabled
 * transformer tests.
 */
export const syncConfig: SyncConfig = {
  ConflictDetection: 'VERSION',
  ConflictHandler: ConflictHandlerType.AUTOMERGE,
};

/**
 * A collection of auth configurations for supporting test rules. Each TestRule references one of these configurations.
 */
export const authConfigs: Record<string, AppSyncAuthConfigurationEntry> = {
  apiKey: {
    authenticationType: 'API_KEY',
  },

  iam: {
    authenticationType: 'AWS_IAM',
  },

  identityPool: {
    authenticationType: 'AWS_IAM',
  },

  oidc: {
    authenticationType: 'OPENID_CONNECT',
    openIDConnectConfig: {
      name: 'oidc auth issuer',
      issuerUrl: 'https://www.example.com',
    },
  },

  userPool: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },

  lambda: {
    authenticationType: 'AWS_LAMBDA',
    lambdaAuthorizerConfig: {
      lambdaFunction: 'authFunction',
    },
  },
};

/**
 * DynamoDB-based ModelDataSourceStrategies to iterate over in combination tests.
 */
export const ddbDataSourceStrategies: Record<string, ModelDataSourceStrategy> = {
  'CFn-managed DDB': DDB_DEFAULT_DATASOURCE_STRATEGY,
  'Amplify-managed DDB': DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
};

/**
 * SQL-based ModelDataSourceStrategies to iterate over in combination tests.
 */
export const sqlDataSourceStrategies: Record<string, SQLLambdaModelDataSourceStrategy> = {
  mysql: mockSqlDataSourceStrategy({ dbType: 'MYSQL' }),
  postgres: mockSqlDataSourceStrategy({ dbType: 'POSTGRES' }),
};

/**
 * A set of test rules for iterating over in combination tests. Each rule declares a different authorization strategy to be injected into a
 * schema's `@auth` declaration.
 */
export const testRules: TestRules = {
  'public, apiKey': {
    ruleTemplate: '{allow: public <EXT>}',
    auth: authConfigs.apiKey,
  },

  'public, iam': {
    ruleTemplate: '{allow: public, provider: iam <EXT>}',
    auth: authConfigs.iam,
  },

  'public, identityPool': {
    ruleTemplate: '{allow: public, provider: identityPool <EXT>}',
    auth: authConfigs.identityPool,
  },

  'private userPools': { ruleTemplate: '{allow: private <EXT>}', auth: authConfigs.userPool },

  'private oidc': {
    ruleTemplate: '{allow: private, provider: oidc, identityClaim: "sub" <EXT>}',
    auth: authConfigs.oidc,
  },

  'private iam': { ruleTemplate: '{allow: private, provider: iam <EXT>}', auth: authConfigs.iam },

  'private identityPool': { ruleTemplate: '{allow: private, provider: identityPool <EXT>}', auth: authConfigs.identityPool },

  'owner, userPools, implicit owner field': { ruleTemplate: '{allow: owner <EXT>}', auth: authConfigs.userPool },

  'owner, userPools, explicit owner field': {
    ruleTemplate: '{allow: owner, ownerField: "customOwner" <EXT>}',
    auth: authConfigs.userPool,
  },

  'owner, oidc, implicit owner field': {
    ruleTemplate: '{allow: owner, provider: oidc, identityClaim: "sub" <EXT>}',
    auth: authConfigs.oidc,
  },

  'owner, oidc, explicit owner field': {
    ruleTemplate: '{allow: owner, provider: oidc, ownerField: "customOwner", identityClaim: "sub" <EXT>}',
    auth: authConfigs.oidc,
  },

  'static groups, userPools': {
    ruleTemplate: '{allow: groups, groups: ["Admin", "Dev"] <EXT>}',
    auth: authConfigs.userPool,
  },

  'static groups, oidc': {
    ruleTemplate: '{allow: groups, groups: ["Admin", "Dev"], provider: oidc, groupClaim: "groups" <EXT>}',
    auth: authConfigs.oidc,
  },

  'dynamic groups, userPools': {
    ruleTemplate: '{allow: groups, groupsField: "customGroups" <EXT>}',
    auth: authConfigs.userPool,
  },

  'dynamic groups, oidc': {
    ruleTemplate: '{allow: groups, groupsField: "customGroups", provider: oidc, groupClaim: "groups" <EXT>}',
    auth: authConfigs.oidc,
  },

  custom: { ruleTemplate: '{allow: custom <EXT>}', auth: authConfigs.lambda },
};

/**
 * Later versions of Jest support `test.each` using arrays of objects, but our version needs to have arguments passed in as array values.
 * Further, our current version of Jest can't interpolate nested object fields into test names, only positional parameters.
 *
 * Note that these elements must match those used in `makePassingTransformationExpectation`. Use the `convertToPassingTestArgumentArray` to
 * convert from the object to an array to add to the test table.
 */
export type TestArguments = {
  strategyName: string;
  fieldRuleName?: string;
  fieldRuleExt?: string;
  modelRuleName?: string;
  modelRuleExt?: string;
  expectedErrorMessage?: string;
};

export type TestTableRow = [string, string | undefined, string | undefined, string | undefined, string | undefined, string | undefined];
export type TestTable = TestTableRow[];

export const convertToTestArgumentArray = (testArgs: TestArguments): TestTableRow => {
  const { strategyName, fieldRuleName, fieldRuleExt, modelRuleName, modelRuleExt, expectedErrorMessage } = testArgs;
  return [strategyName, fieldRuleName, fieldRuleExt, modelRuleName, modelRuleExt, expectedErrorMessage];
};

export const makeTransformationExpectation = (
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  schemaTemplate: string,
  makeTransformers: () => TransformerPluginProvider[],
): ((
  strategyName: string,
  fieldRuleName: string | undefined,
  fieldRuleExt: string | undefined,
  modelRuleName: string | undefined,
  modelRuleExt: string | undefined,
  expectedErrorMessage: string | undefined,
) => void) => {
  const expectation = (
    strategyName: string,
    fieldRuleName: string | undefined,
    fieldRuleExt: string | undefined,
    modelRuleName: string | undefined,
    modelRuleExt: string | undefined,
    expectedErrorMessage: string | undefined,
  ): void => {
    const transformParams = resolveTransformParams({
      dataSourceStrategies,
      schemaTemplate,
      makeTransformers,
      strategyName,
      fieldRuleName,
      fieldRuleExt,
      modelRuleName,
      modelRuleExt,
    });

    if (expectedErrorMessage) {
      expect(() => testTransform(transformParams)).toThrowError(expectedErrorMessage);
    } else {
      const out = testTransform(transformParams);
      expect(out).toBeDefined();

      if (process.env.USE_COMBINATION_SNAPSHOTS) {
        // The `functions` member includes local paths to zipped function resources. Those won't be useful to test, so we'll remove them
        // here and rely on local unit tests to ensure they are packaged as expected.
        delete (out as any).functions;
        expect(out).toMatchSnapshot();
      }
    }
  };
  return expectation;
};

type ResolveTransformParamsProps = {
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>;
  schemaTemplate: string;
  makeTransformers: () => TransformerPluginProvider[];
  strategyName: string;
  fieldRuleName: string | undefined;
  fieldRuleExt: string | undefined;
  modelRuleName: string | undefined;
  modelRuleExt: string | undefined;
};

const resolveTransformParams = (options: ResolveTransformParamsProps): TestTransformParameters => {
  const { dataSourceStrategies, schemaTemplate, makeTransformers, strategyName, fieldRuleName, fieldRuleExt, modelRuleName, modelRuleExt } =
    options;

  const modelRule = modelRuleName ? testRules[modelRuleName] : undefined;
  const fieldRule = fieldRuleName ? testRules[fieldRuleName] : undefined;

  if (!modelRule && !fieldRule) {
    throw new Error('Either modelRuleName or fieldRuleName must be specified and valid');
  }

  const schema = resolveSchema(schemaTemplate, modelRule?.ruleTemplate, fieldRule?.ruleTemplate, modelRuleExt, fieldRuleExt);

  const defaultAuthentication = modelRule ? modelRule.auth : fieldRule?.auth;

  let additionalAuthenticationProviders: AppSyncAuthConfigurationEntry[] = [];
  if (modelRuleName && fieldRuleName && modelRuleName !== fieldRuleName) {
    additionalAuthenticationProviders = [fieldRule!.auth];
  }

  const strategy = dataSourceStrategies[strategyName];

  const transformParams: TestTransformParameters = {
    schema,
    authConfig: {
      defaultAuthentication: defaultAuthentication!,
      additionalAuthenticationProviders,
    },
    transformers: makeTransformers(),
    dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
  };
  return transformParams;
};

const resolveSchema = (
  schemaTemplate: string,
  modelRuleTemplate: string | undefined,
  fieldRuleTemplate: string | undefined,
  modelRuleExt: string | undefined,
  fieldRuleExt: string | undefined,
): string => {
  let schema = schemaTemplate;

  let modelRuleString = '';
  if (modelRuleTemplate) {
    modelRuleString = modelRuleTemplate.replace(/<EXT>/g, modelRuleExt ?? '');
  }
  schema = schema.replace(/<MODEL_AUTH_RULE>/g, modelRuleString);

  let fieldRuleString = '';
  if (fieldRuleTemplate) {
    fieldRuleString = fieldRuleTemplate.replace(/<EXT>/g, fieldRuleExt ?? '');
  }
  schema = schema.replace(/<FIELD_AUTH_RULE>/g, fieldRuleString);

  return schema;
};
