import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { SearchableModelTransformer } from '@aws-amplify/graphql-searchable-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode, ObjectTypeDefinitionNode, Kind, FieldDefinitionNode, parse } from 'graphql';
import { AuthTransformer, SEARCHABLE_AGGREGATE_TYPES } from '..';

const getObjectType = (doc: DocumentNode, type: string): ObjectTypeDefinitionNode | undefined =>
  doc.definitions.find((def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type) as
    | ObjectTypeDefinitionNode
    | undefined;

const expectMultiple = (fieldOrType: ObjectTypeDefinitionNode | FieldDefinitionNode, directiveNames: string[]): void => {
  expect(directiveNames).toBeDefined();
  expect(directiveNames).toHaveLength(directiveNames.length);
  expect(fieldOrType?.directives?.length).toEqual(directiveNames.length);
  directiveNames.forEach((directiveName) => {
    expect(fieldOrType.directives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.objectContaining({ value: directiveName }),
        }),
      ]),
    );
  });
};

test('auth logic is enabled on owner/static rules in os request', () => {
  const validSchema = `
        type Comment @model
            @searchable
            @auth(rules: [
                { allow: owner }
                { allow: groups, groups: ["writer"]}
            ])
        {
            id: ID!
            content: String
        }
    `;
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [],
  };
  const out = testTransform({
    schema: validSchema,
    authConfig,
    transformers: [new ModelTransformer(), new SearchableModelTransformer(), new AuthTransformer()],
  });
  // expect response resolver to contain auth logic for owner rule
  expect(out).toBeDefined();
  expect(out.resolvers['Query.searchComments.auth.1.req.vtl']).toContain('$util.qr($ownerClaimsList0.add($ownerClaim0))');
  expect(out.resolvers['Query.searchComments.auth.1.req.vtl']).toContain('"terms": $ownerClaimsList0,');
  // expect response resolver to contain auth logic for group rule
  expect(out.resolvers['Query.searchComments.auth.1.req.vtl']).toContain(
    '#set( $staticGroupRoles = [{"claim":"cognito:groups","entity":"writer"}] )',
  );
});

test('auth logic is enabled for iam/apiKey auth rules', () => {
  const expectedDirectives = ['aws_api_key', 'aws_iam'];
  const validSchema = `
        type Post @model
            @searchable
            @auth(rules: [
                { allow: public, provider: apiKey } # api key is allowed
                { allow: private, provider: iam } # auth roles are allowed
            ]) {
            id: ID!
            content: String
            secret: String @auth(rules: [{ allow: private, provider: iam }]) # only auth role can do crud on this
        }
    `;
  const authConfigs: Array<AppSyncAuthConfiguration> = [
    {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
          apiKeyConfig: {
            description: 'E2E Test API Key',
            apiKeyExpirationDays: 300,
          },
        },
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
        apiKeyConfig: {
          description: 'E2E Test API Key',
          apiKeyExpirationDays: 300,
        },
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
          apiKeyConfig: {
            description: 'E2E Test API Key',
            apiKeyExpirationDays: 300,
          },
        },
      ],
    },
  ];
  authConfigs.forEach((authConfig) => {
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new SearchableModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const schemaDoc = parse(out.schema);
    SEARCHABLE_AGGREGATE_TYPES.forEach((aggregateType) => {
      const objectType = getObjectType(schemaDoc, aggregateType);
      expect(objectType).toBeDefined();
      expectMultiple(objectType!, expectedDirectives);
    });
    // expect the searchable types to have the auth directives for total providers
    // expect the allowed fields for agg to exclude secret
    expect(out.resolvers['Query.searchPosts.auth.1.req.vtl']).toContain(
      '#set( $allowedAggFields = ["createdAt","updatedAt","id","content"] )',
    );
  });
});

test('auth logic is enabled for identityPool/apiKey auth rules', () => {
  const expectedDirectives = ['aws_api_key', 'aws_iam'];
  const validSchema = `
        type Post @model
            @searchable
            @auth(rules: [
                { allow: public, provider: apiKey } # api key is allowed
                { allow: private, provider: identityPool } # auth roles are allowed
            ]) {
            id: ID!
            content: String
            secret: String @auth(rules: [{ allow: private, provider: identityPool }]) # only auth role can do crud on this
        }
    `;
  const authConfigs: Array<AppSyncAuthConfiguration> = [
    {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
          apiKeyConfig: {
            description: 'E2E Test API Key',
            apiKeyExpirationDays: 300,
          },
        },
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
        apiKeyConfig: {
          description: 'E2E Test API Key',
          apiKeyExpirationDays: 300,
        },
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
          apiKeyConfig: {
            description: 'E2E Test API Key',
            apiKeyExpirationDays: 300,
          },
        },
      ],
    },
  ];
  authConfigs.forEach((authConfig) => {
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new SearchableModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const schemaDoc = parse(out.schema);
    SEARCHABLE_AGGREGATE_TYPES.forEach((aggregateType) => {
      const objectType = getObjectType(schemaDoc, aggregateType);
      expect(objectType).toBeDefined();
      expectMultiple(objectType!, expectedDirectives);
    });
    // expect the searchable types to have the auth directives for total providers
    // expect the allowed fields for agg to exclude secret
    expect(out.resolvers['Query.searchPosts.auth.1.req.vtl']).toContain(
      '#set( $allowedAggFields = ["createdAt","updatedAt","id","content"] )',
    );
  });
});

test('aggregate items are added to stash for iam public auth rule', () => {
  const validSchema = `
    type Todo @model @searchable
    @auth(
      rules: [
        { allow: groups, groups: ["Admin"] }
        { allow: public, provider: iam }
      ]
    ) {
    id: ID!
    createdDate: AWSDateTime
  }`;
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [
      {
        authenticationType: 'AWS_IAM',
      },
    ],
  };
  const out = testTransform({
    schema: validSchema,
    authConfig,
    transformers: [new ModelTransformer(), new SearchableModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toBeDefined();
  // expect to set allowed agg fields in stash before return
  expect(out.resolvers['Query.searchTodos.auth.1.req.vtl']).toContain('$util.qr($ctx.stash.put("allowedAggFields", $allowedAggFields))');
});

test('aggregate items are added to stash for identityPool public auth rule', () => {
  const validSchema = `
    type Todo @model @searchable
    @auth(
      rules: [
        { allow: groups, groups: ["Admin"] }
        { allow: public, provider: identityPool }
      ]
    ) {
    id: ID!
    createdDate: AWSDateTime
  }`;
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [
      {
        authenticationType: 'AWS_IAM',
      },
    ],
  };
  const out = testTransform({
    schema: validSchema,
    authConfig,
    transformers: [new ModelTransformer(), new SearchableModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toBeDefined();
  // expect to set allowed agg fields in stash before return
  expect(out.resolvers['Query.searchTodos.auth.1.req.vtl']).toContain('$util.qr($ctx.stash.put("allowedAggFields", $allowedAggFields))');
});

describe('identity flag feature flag disabled', () => {
  test('auth logic is enabled on owner/static rules in os request', () => {
    const validSchema = `
          type Comment @model
              @searchable
              @auth(rules: [
                  { allow: owner }
                  { allow: groups, groups: ["writer"]}
              ])
          {
              id: ID!
              content: String
          }
      `;
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new SearchableModelTransformer(), new AuthTransformer()],
    });
    // expect response resolver to contain auth logic for owner rule
    expect(out).toBeDefined();
    expect(out.resolvers['Query.searchComments.auth.1.req.vtl']).toContain('$util.qr($ownerClaimsList0.add($ownerClaim0))');
    expect(out.resolvers['Query.searchComments.auth.1.req.vtl']).toContain('"terms": $ownerClaimsList0,');
    // expect response resolver to contain auth logic for group rule
    expect(out.resolvers['Query.searchComments.auth.1.req.vtl']).toContain(
      '#set( $staticGroupRoles = [{"claim":"cognito:groups","entity":"writer"}] )',
    );
  });
});
