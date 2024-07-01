import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy, TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { getModelTypeNames } from '@aws-amplify/graphql-transformer-core';
import { AuthTransformer } from '../graphql-auth-transformer';
import { ddbDataSourceStrategies, sqlDataSourceStrategies } from './combination-tests/snapshot-utils';

const SUBSCRIPTION_PROTECTION = `## [Start] Check if subscriptions is protected. **
#if( $util.defaultIfNull($ctx.source.get("__operation"), null) == "Mutation" )
  $util.qr($ctx.stash.put("deniedField", true))
#end
## [End] Check if subscriptions is protected. **`;

const makeTransformers: () => TransformerPluginProvider[] = () => [
  new ModelTransformer(),
  new PrimaryKeyTransformer(),
  new IndexTransformer(),
  new HasOneTransformer(),
  new HasManyTransformer(),
  new BelongsToTransformer(),
  new AuthTransformer(),
];

const authConfigWithAllProviders: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [
    { authenticationType: 'API_KEY' },
    { authenticationType: 'AWS_IAM' },
    {
      authenticationType: 'AWS_LAMBDA',
      lambdaAuthorizerConfig: {
        lambdaFunction: 'test',
        ttlSeconds: 600,
      },
    },
    {
      authenticationType: 'OPENID_CONNECT',
      openIDConnectConfig: {
        name: 'myOIDCProvider',
        issuerUrl: 'https://some-oidc-provider/auth',
        clientId: 'my-sample-client-id',
      },
    },
  ],
};

const fieldSchemaTemplate = `
  type Primary
    @model
    @auth(
      rules: [
        <PRIMARY_MODEL_AUTH_RULES>
      ]
    ) {
    id: ID! @primaryKey
    primarySecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    relatedMany: [RelatedMany] @hasMany(indexName: "byP", fields: ["id"])
    primaryRelatedOneId: ID
    relatedOne: RelatedOne @hasOne(fields: ["primaryRelatedOneId"])
  }

  type RelatedMany
    @model
    @auth(
      rules: [
        <RELATED_MODEL_AUTH_RULES>
      ]
    ) {
    id: ID! @primaryKey
    relatedSecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    primaryId: ID @index(name: "byP")
    primary: Primary @belongsTo(fields: ["primaryId"])
  }

  type RelatedOne
    @model
    @auth(
      rules: [
        <RELATED_MODEL_AUTH_RULES>
      ]
    ) {
    id: ID! @primaryKey
    relatedSecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    relatedOnePrimaryId: ID
    primary: Primary @belongsTo(fields: ["relatedOnePrimaryId"])
  }
`;

const fieldSchemaRequiredTemplate = `
  type Primary
    @model
    @auth(
      rules: [
        <PRIMARY_MODEL_AUTH_RULES>
      ]
    ) {
    id: ID! @primaryKey
    primarySecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    relatedMany: [RelatedMany!]! @hasMany(indexName: "byP", fields: ["id"])
    primaryRelatedOneId: ID
    relatedOne: RelatedOne! @hasOne(fields: ["primaryRelatedOneId"])
  }

  type RelatedMany
    @model
    @auth(
      rules: [
        <RELATED_MODEL_AUTH_RULES>
      ]
    ) {
    id: ID! @primaryKey
    relatedSecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    primaryId: ID @index(name: "byP")
    primary: Primary! @belongsTo(fields: ["primaryId"])
  }

  type RelatedOne
    @model
    @auth(
      rules: [
        <RELATED_MODEL_AUTH_RULES>
      ]
    ) {
    id: ID! @primaryKey
    relatedSecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    relatedOnePrimaryId: ID
    primary: Primary! @belongsTo(fields: ["relatedOnePrimaryId"])
  }
`;

const referenceSchemaTemplate = `
  type Primary
  @model
  @auth(
    rules: [
      <PRIMARY_MODEL_AUTH_RULES>
    ]
  ) {
    id: ID! @primaryKey
    primarySecret: String
    owner: String
    owners: [String]
    singleGroup: String
    groups: [String]
    relatedMany: [RelatedMany] @hasMany(references: ["primaryId"])
    relatedOne: RelatedOne @hasOne(references: ["primaryId"])
  }

  type RelatedMany
  @model
  @auth(
    rules: [
      <RELATED_MODEL_AUTH_RULES>
    ]
  ) {
    id: ID! @primaryKey
    owner: ID
    relatedSecret: String
    primaryId: ID
    primary: Primary @belongsTo(references: ["primaryId"])
  }

  type RelatedOne
  @model
  @auth(
    rules: [
      <RELATED_MODEL_AUTH_RULES>
    ]
  ) {
    id: ID! @primaryKey
    owner: ID
    relatedSecret: String
    primaryId: ID
    primary: Primary @belongsTo(references: ["primaryId"])
  }

`;

const authRuleNameToTemplateMap: Record<string, string> = {
  'public apiKey': '{ allow: public }',
  'public iam': '{ allow: public, provider: iam }',
  'private userPools': '{ allow: private }',
  'private oidc': '{ allow: private, provider: oidc }',
  'private iam': '{ allow: private, provider: iam }',
  'owner userPools': '{ allow: owner, ownerField: "owner" }',
  'owner oidc': '{ allow: owner, ownerField: "owner", provider: oidc }',
  'owner userPools claim': '{ allow: owner, ownerField: "owner", identityClaim: "ssn" }',
  'static groups userPools single': '{ allow: groups, groups: ["Admin"] }',
  'static groups userPools multiple': '{ allow: groups, groups: ["Admin", "Dev"] }',
  'static groups oidc single': '{ allow: groups, groups: ["Admin"] provider: oidc }',
  'static groups oidc multiple': '{ allow: groups, groups: ["Admin", "Dev"] provider: oidc }',
  'dynamic groups userPools': '{ allow: groups, groupsField: "singleGroup" }',
  'dynamic groups oidc': '{ allow: groups, groupsField: "singleGroup", provider: oidc }',
  custom: '{ allow: custom }',
};

const resolveSchema = (schemaTemplate: string, primaryModelRules: string[], relatedModelRules: string[]): string => {
  let schema = schemaTemplate;
  const primaryModelAuthRuleStr = primaryModelRules.map((rule) => authRuleNameToTemplateMap[rule]).join('\n');
  const relatedModelAuthRuleStr = relatedModelRules.map((rule) => authRuleNameToTemplateMap[rule]).join('\n');
  schema = schema.replace(/<PRIMARY_MODEL_AUTH_RULES>/g, primaryModelAuthRuleStr);
  schema = schema.replace(/<RELATED_MODEL_AUTH_RULES>/g, relatedModelAuthRuleStr);
  return schema;
};

const makeTransformationRedactionExpectation = (
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  schemaTemplate: string,
): ((
  primaryStrategyName: string,
  relatedStrategyName: string,
  primaryModelRules: string[],
  relatedModelRules: string[],
  shouldRedactField: boolean,
  primaryModelNames?: string[],
) => void) => {
  const expectation = (
    primaryStrategyName: string,
    relatedStrategyName: string,
    primaryModelRules: string[],
    relatedModelRules: string[],
    shouldRedactField: boolean,
    primaryModelNames = ['Primary'],
  ): void => {
    const validSchema = resolveSchema(schemaTemplate, primaryModelRules, relatedModelRules);
    const modelKeys = getModelTypeNames(validSchema);
    const out = testTransform({
      schema: validSchema,
      authConfig: authConfigWithAllProviders,
      transformers: makeTransformers(),
      dataSourceStrategies: modelKeys.reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: dataSourceStrategies[primaryModelNames.includes(cur) ? primaryStrategyName : relatedStrategyName],
        }),
        {},
      ),
    });
    expect(out).toBeDefined();
    if (shouldRedactField) {
      expect(out.resolvers['Primary.relatedMany.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['Primary.relatedOne.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedMany.primary.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedOne.primary.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
    } else {
      expect(out.resolvers['Primary.relatedMany.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['Primary.relatedOne.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedMany.primary.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedOne.primary.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
    }
  };
  return expectation;
};

const makeTransformationNonRedactionExpectation = (
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  schemaTemplate: string,
): ((
  primaryStrategyName: string,
  relatedStrategyName: string,
  primaryModelRules: string[],
  relatedModelRules: string[],
  shouldRedactField: boolean,
  primaryModelNames?: string[],
) => void) => {
  const expectation = (
    primaryStrategyName: string,
    relatedStrategyName: string,
    primaryModelRules: string[],
    relatedModelRules: string[],
    shouldRedactField: boolean,
    primaryModelNames = ['Primary'],
  ): void => {
    const validSchema = resolveSchema(schemaTemplate, primaryModelRules, relatedModelRules);
    const modelKeys = getModelTypeNames(validSchema);
    const out = testTransform({
      schema: validSchema,
      authConfig: authConfigWithAllProviders,
      transformers: makeTransformers(),
      transformParameters: {
        subscriptionsInheritPrimaryAuth: true,
      },
      dataSourceStrategies: modelKeys.reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: dataSourceStrategies[primaryModelNames.includes(cur) ? primaryStrategyName : relatedStrategyName],
        }),
        {},
      ),
    });
    expect(out).toBeDefined();
    if (shouldRedactField) {
      expect(out.resolvers['Primary.relatedMany.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['Primary.relatedOne.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedMany.primary.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedOne.primary.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
    } else {
      expect(out.resolvers['Primary.relatedMany.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['Primary.relatedOne.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedMany.primary.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
      expect(out.resolvers['RelatedOne.primary.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
    }
  };
  return expectation;
};

type TestTableRow = [string, string, string[], string[], boolean];

/**
 * Primary auth rules - Related auth rules - Redact relational field
 */
const testCases: [string[], string[], boolean][] = [
  // Cases for field redaction
  [['public apiKey', 'private userPools'], ['private userPools'], true],
  [['public apiKey', 'owner userPools'], ['public apiKey', 'owner userPools'], true],
  [['custom'], ['custom'], true],
  [['dynamic groups userPools'], ['dynamic groups userPools'], true],
  [['private userPools'], ['owner userPools'], true],
  [['static groups userPools multiple'], ['static groups userPools single'], true],
  [['private oidc', 'dynamic groups userPools'], ['private oidc', 'dynamic groups userPools'], true],
  // Cases for non field redaction
  [['private userPools', 'owner userPools'], ['private userPools'], false],
  [['private oidc', 'dynamic groups oidc'], ['private oidc', 'dynamic groups oidc'], false],
  [['private userPools'], ['private userPools'], false],
  [['private oidc', 'static groups oidc single'], ['private oidc', 'static groups oidc single'], false],
  [['owner oidc'], ['owner userPools'], false],
  [['owner userPools'], ['owner userPools claim'], false],
  [['public iam'], ['private iam'], false],
];

const buildHomogeneousTestCases = (
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  schema: string,
  testTemplate = testCases,
): void => {
  const redactionExpectation = makeTransformationRedactionExpectation(dataSourceStrategies, schema);
  const nonRedactionExpectation = makeTransformationNonRedactionExpectation(dataSourceStrategies, schema);
  const testTable: TestTableRow[] = [];
  for (const strategyName of Object.keys(dataSourceStrategies)) {
    testTemplate.forEach((testCase) => {
      testTable.push([strategyName, strategyName, ...testCase] as TestTableRow);
    });
  }
  test.each(testTable)('%s -> %s - Primary %s - Related %s should redact relational field - %s', redactionExpectation);

  const nonRedactionTestTable: TestTableRow[] = [];
  for (const strategyName of Object.keys(dataSourceStrategies)) {
    testTemplate.forEach((testCase) => {
      nonRedactionTestTable.push([strategyName, strategyName, ...testCase.slice(0, 2), false] as TestTableRow);
    });
  }
  test.each(nonRedactionTestTable)('%s -> %s - Primary %s - Related %s should not redact relational field - %s', nonRedactionExpectation);
};

const buildHeterogeneousTestCases = (
  primaryDataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  relatedDataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  schema: string,
  testTemplate = testCases,
): void => {
  const redactionExpectation = makeTransformationRedactionExpectation(
    {
      ...primaryDataSourceStrategies,
      ...relatedDataSourceStrategies,
    },
    schema,
  );
  const nonRedactionExpectation = makeTransformationNonRedactionExpectation(
    {
      ...primaryDataSourceStrategies,
      ...relatedDataSourceStrategies,
    },
    schema,
  );
  const testTable: TestTableRow[] = [];
  for (const primaryStrategyName of Object.keys(primaryDataSourceStrategies)) {
    for (const relatedStrategyName of Object.keys(relatedDataSourceStrategies)) {
      testTemplate.forEach((testCase) => {
        testTable.push([primaryStrategyName, relatedStrategyName, ...testCase] as TestTableRow);
      });
    }
  }
  test.each(testTable)('%s -> %s - Primary %s - Related %s should redact relational field - %s', redactionExpectation);

  const nonRedactionTestTable: TestTableRow[] = [];
  for (const primaryStrategyName of Object.keys(primaryDataSourceStrategies)) {
    for (const relatedStrategyName of Object.keys(relatedDataSourceStrategies)) {
      testTemplate.forEach((testCase) => {
        nonRedactionTestTable.push([primaryStrategyName, relatedStrategyName, ...testCase.slice(0, 2), false] as TestTableRow);
      });
    }
  }
  test.each(nonRedactionTestTable)('%s -> %s - Primary %s - Related %s should not redact relational field - %s', nonRedactionExpectation);
};

describe('Relational field redaction tests', () => {
  describe('non-required relational field', () => {
    describe('DDB datasources - field relation', () => {
      buildHomogeneousTestCases(ddbDataSourceStrategies, fieldSchemaTemplate);
    });
    describe('DDB datasources - reference relation', () => {
      buildHomogeneousTestCases(ddbDataSourceStrategies, referenceSchemaTemplate);
    });
    describe('RDS datasources - reference relation', () => {
      buildHomogeneousTestCases(sqlDataSourceStrategies, referenceSchemaTemplate);
    });
    describe('DDB Primary, SQL Related - reference relation', () => {
      buildHeterogeneousTestCases(ddbDataSourceStrategies, sqlDataSourceStrategies, referenceSchemaTemplate);
    });
    describe('SQL Primary, DDB Related - reference relation', () => {
      buildHeterogeneousTestCases(sqlDataSourceStrategies, ddbDataSourceStrategies, referenceSchemaTemplate);
    });
  });

  describe('required relational field', () => {
    // does not use test setup function because required hasMany relationships can still be redacted without error
    describe('DDB datasources - field relation', () => {
      const testTable: TestTableRow[] = [];
      for (const strategyName of Object.keys(ddbDataSourceStrategies)) {
        testCases.forEach((testCase) => {
          testTable.push([strategyName, strategyName, ...testCase] as TestTableRow);
        });
      }
      test.each(testTable)(
        '%s -> %s - Primary %s - Related %s should redact relational field - %s',
        (
          primaryStrategyName: string,
          relatedStrategyName: string,
          primaryModelRules: string[],
          relatedModelRules: string[],
          shouldRedactField: boolean,
          primaryModelNames = ['Primary'],
        ) => {
          const validSchema = resolveSchema(fieldSchemaRequiredTemplate, primaryModelRules, relatedModelRules);
          const modelKeys = getModelTypeNames(validSchema);
          const out = testTransform({
            schema: validSchema,
            authConfig: authConfigWithAllProviders,
            transformers: makeTransformers(),
            dataSourceStrategies: modelKeys.reduce(
              (acc, cur) => ({
                ...acc,
                [cur]: ddbDataSourceStrategies[primaryModelNames.includes(cur) ? primaryStrategyName : relatedStrategyName],
              }),
              {},
            ),
          });
          expect(out).toBeDefined();
          expect(out.resolvers['Primary.relatedOne.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
          expect(out.resolvers['RelatedMany.primary.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
          expect(out.resolvers['RelatedOne.primary.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);

          // required hasMany relationships can still be redacted without error
          if (shouldRedactField) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(out.resolvers['Primary.relatedMany.auth.1.req.vtl']).toContain(SUBSCRIPTION_PROTECTION);
          } else {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(out.resolvers['Primary.relatedMany.auth.1.req.vtl']).not.toContain(SUBSCRIPTION_PROTECTION);
          }
        },
      );
    });
  });
});
