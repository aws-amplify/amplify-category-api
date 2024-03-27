import { ConflictHandlerType } from '@aws-amplify/graphql-transformer-core';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { parse } from 'graphql';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { SearchableModelTransformer } from '..';
import { ALLOWABLE_SEARCHABLE_INSTANCE_TYPES } from '../constants';
import { describe } from 'jest-circus';

test('SearchableModelTransformer validation happy case', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.schema).toMatchSnapshot();
});

test('Throws error for Searchable RDS Models', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
    }
  `;
  expect(() =>
    testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new SearchableModelTransformer()],
      dataSourceStrategies: {
        Post: mockSqlDataSourceStrategy(),
      },
    }),
  ).toThrowErrorMatchingInlineSnapshot(`"@searchable is not supported on \\"Post\\" model as it uses RDS datasource."`);
});

test('SearchableModelTransformer vtl', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });

  expect(parse(out.schema)).toBeDefined();
  expect(out.resolvers['Query.searchPosts.req.vtl']).toBeDefined();
  expect(out.resolvers['Query.searchPosts.req.vtl']).toContain('$util.qr($aggregateValues.put("$aggItem.name", $aggregateValue))');
  expect(out.resolvers).toMatchSnapshot();
});

test('SearchableModelTransformer with datastore enabled vtl', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
    resolverConfig: {
      project: {
        ConflictHandler: ConflictHandlerType.AUTOMERGE,
        ConflictDetection: 'VERSION',
      },
    },
  });

  expect(parse(out.schema)).toBeDefined();
  expect(out.resolvers['Query.searchPosts.req.vtl']).toBeDefined();
  expect(out.resolvers['Query.searchPosts.req.vtl']).toContain('$util.qr($aggregateValues.put("$aggItem.name", $aggregateValue))');
  expect(out.resolvers['Query.searchPosts.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.searchPosts.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.searchPosts.res.vtl']).toContain('$util.qr($row.put("_version", $entry.get("_version")))');
});

test('SearchableModelTransformer with query overrides', () => {
  const validSchema = `type Post @model @searchable(queries: { search: "customSearchPost" }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });
  expect(out).toBeDefined();
  expect(parse(out.schema)).toBeDefined();
  expect(out.schema).toMatchSnapshot();
});

test('SearchableModelTransformer with only create mutations', () => {
  const validSchema = `type Post @model(mutations: { create: "customCreatePost" }) @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
    transformParameters: {
      shouldDeepMergeDirectiveConfigDefaults: false,
    },
  });
  expect(out).toBeDefined();
  expect(out.schema).toBeDefined();
  expect(out.schema).toMatchSnapshot();
});

test('SearchableModelTransformer with multiple model searchable directives', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }

    type User @model @searchable {
        id: ID!
        name: String!
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toBeDefined();
  expect(out.schema).toMatchSnapshot();
});

test('SearchableModelTransformer with sort fields', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toBeDefined();
  expect(out.schema).toMatchSnapshot();
});

test('it generates expected resources', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    type Todo @model @searchable {
        id: ID!
        name: String!
        description: String
        createdAt: String
        updatedAt: String
    }
    type Comment @model {
      id: ID!
      content: String!
    }
 `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });
  expect(out).toBeDefined();
  const searchableStack = out.stacks.SearchableStack;
  Template.fromJSON(searchableStack).hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });
  Template.fromJSON(searchableStack).hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'appsync.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });
  Template.fromJSON(searchableStack).hasResourceProperties('AWS::Elasticsearch::Domain', {
    DomainName: Match.anyValue(),
    EBSOptions: Match.anyValue(),
    ElasticsearchClusterConfig: Match.anyValue(),
    ElasticsearchVersion: '7.10',
    DomainEndpointOptions: {
      EnforceHTTPS: true,
    },
  });
  Template.fromJSON(searchableStack).hasResource('AWS::Elasticsearch::Domain', {
    UpdateReplacePolicy: 'Delete',
    DeletionPolicy: 'Delete',
  });
  Template.fromJSON(searchableStack).hasResourceProperties('AWS::AppSync::DataSource', {
    ApiId: {
      Ref: Match.anyValue(),
    },
    Name: 'OpenSearchDataSource',
    Type: 'AMAZON_ELASTICSEARCH',
    ElasticsearchConfig: {
      AwsRegion: {
        'Fn::Select': [
          3,
          {
            'Fn::Split': [
              ':',
              {
                'Fn::GetAtt': ['OpenSearchDomain', 'Arn'],
              },
            ],
          },
        ],
      },
      Endpoint: {
        'Fn::Join': [
          '',
          [
            'https://',
            {
              'Fn::GetAtt': ['OpenSearchDomain', 'DomainEndpoint'],
            },
          ],
        ],
      },
    },
    ServiceRoleArn: {
      'Fn::GetAtt': ['OpenSearchAccessIAMRole6A1D9CC5', 'Arn'],
    },
  });
  Template.fromJSON(searchableStack).resourceCountIs('AWS::AppSync::Resolver', 2);
  Template.fromJSON(searchableStack).hasResourceProperties('AWS::AppSync::Resolver', {
    ApiId: {
      Ref: Match.anyValue(),
    },
    FieldName: Match.anyValue(),
    TypeName: 'Query',
    Kind: 'PIPELINE',
    PipelineConfig: {
      Functions: [
        {
          Ref: Match.anyValue(),
        },
        {
          'Fn::GetAtt': [Match.anyValue(), 'FunctionId'],
        },
      ],
    },
    RequestMappingTemplate: {
      'Fn::Join': [
        '',
        [
          Match.anyValue(),
          {
            Ref: Match.anyValue(),
          },
          '"))\n$util.qr($ctx.stash.put("connectionAttributes", {}))\n$util.qr($ctx.stash.put("endpoint", "https://',
          {
            'Fn::GetAtt': ['OpenSearchDomain', 'DomainEndpoint'],
          },
          '"))\n$util.qr($ctx.stash.put("adminRoles", []))\n$util.toJson({})',
        ],
      ],
    },
    ResponseMappingTemplate: '$util.toJson($ctx.prev.result)',
  });
  Template.fromJSON(searchableStack).hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
    ApiId: {
      Ref: Match.anyValue(),
    },
    DataSourceName: {
      'Fn::GetAtt': [Match.anyValue(), 'Name'],
    },
    FunctionVersion: '2018-05-29',
    Name: Match.anyValue(),
    RequestMappingTemplateS3Location: {
      'Fn::Join': [
        '',
        [
          's3://',
          {
            Ref: Match.anyValue(),
          },
          '/',
          {
            Ref: Match.anyValue(),
          },
          Match.anyValue(),
        ],
      ],
    },
    ResponseMappingTemplateS3Location: {
      'Fn::Join': [
        '',
        [
          's3://',
          {
            Ref: Match.anyValue(),
          },
          '/',
          {
            Ref: Match.anyValue(),
          },
          Match.anyValue(),
        ],
      ],
    },
  });
});

test('SearchableModelTransformer enum type generates StringFilterInput', () => {
  const validSchema = `
    type Employee @model @searchable {
      id: ID!
      firstName: String!
      lastName: String!
      type: EmploymentType!
    }

    enum EmploymentType {
      FULLTIME
      HOURLY
    }
    `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
  });
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.schema).toMatchSnapshot();
});

describe('SearchableModelTransformer with datastore enabled and sort field defined vtl', () => {
  test('it should populate auto-generated timestamp fields in non keywords and omit datastore reserved fields when in implicit schema', () => {
    const validSchema = `
      type Post @model @searchable {
        id: ID!
        title: String!
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      resolverConfig: {
        project: {
          ConflictHandler: ConflictHandlerType.AUTOMERGE,
          ConflictDetection: 'VERSION',
        },
      },
    });

    expect(parse(out.schema)).toBeDefined();
    expect(out.resolvers['Query.searchPosts.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.searchPosts.res.vtl']).toMatchSnapshot();
  });
});

describe('Searchable Instance Type Validation Test', () => {
  it('Should include search instances', () => {
    expect(ALLOWABLE_SEARCHABLE_INSTANCE_TYPES).toContain('t3.medium.search');
  });
});

describe('nodeToNodeEncryption transformParameter', () => {
  const schema = /* GraphQL */ `
    type Todo @model @searchable {
      content: String!
    }
  `;
  it('synthesizes w/ nodeToNodeEncryption disabled by default', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
    });
    expect(out).toBeDefined();
    const searchableStack = out.stacks.SearchableStack;
    Template.fromJSON(searchableStack).hasResourceProperties('AWS::Elasticsearch::Domain', {
      NodeToNodeEncryptionOptions: {
        Enabled: false,
      },
    });
  });

  it('synthesizes w/ nodeToNodeEncryption enabled if specified', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      transformParameters: {
        enableSearchNodeToNodeEncryption: true,
      },
    });
    expect(out).toBeDefined();
    const searchableStack = out.stacks.SearchableStack;
    Template.fromJSON(searchableStack).hasResourceProperties('AWS::Elasticsearch::Domain', {
      NodeToNodeEncryptionOptions: {
        Enabled: true,
      },
    });
  });
});

describe('auth', () => {
  const schema = /* GraphQL */ `
    type Todo @model @searchable {
      content: String!
    }
  `;

  it('sandbox auth enabled should add apiKey if not default mode of auth', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      synthParameters: {
        enableIamAccess: false,
      },
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'API_KEY',
          },
        ],
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).toContain('aws_api_key');
    expect(out.schema).not.toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
  });

  it('iam auth enabled should add aws_iam if not default mode of auth', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: false,
      },
      synthParameters: {
        enableIamAccess: true,
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).not.toContain('aws_api_key');
    expect(out.schema).toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
  });

  it('iam and sandbox auth enabled should add aws_iam and aws_api_key if not default mode of auth', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
      synthParameters: {
        enableIamAccess: true,
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).toContain('aws_api_key');
    expect(out.schema).toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
  });

  it('iam and sandbox auth disable should not add service directives', () => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new SearchableModelTransformer()],
      transformParameters: {
        sandboxModeEnabled: false,
      },
      synthParameters: {
        enableIamAccess: false,
      },
    });
    expect(out).toBeDefined();
    expect(out.schema).not.toContain('aws_api_key');
    expect(out.schema).not.toContain('aws_iam');
    expect(out.schema).toMatchSnapshot();
  });
});
