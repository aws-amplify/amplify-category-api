import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, deleteProject } from 'amplify-category-api-e2e-core';
import { CloudFormationClient, ListStacksCommand, DescribeStackEventsCommand, StackEvent } from '@aws-sdk/client-cloudformation';
import { initCDKProject, cdkDeploy, cdkDestroy, createGen1ProjectForMigration, deleteDDBTables } from '../../commands';
import { TestDefinition, writeStackConfig, writeTestDefinitions, writeOverrides } from '../../utils';
import { DURATION_20_MINUTES } from '../../utils/duration-constants';

jest.setTimeout(DURATION_20_MINUTES);

describe('Migration table import validation', () => {
  let gen1ProjRoot: string;
  let gen2ProjRoot: string;
  let gen1ProjFolderName: string;
  let gen2ProjFolderName: string;
  let dataSourceMapping: Record<string, string>;

  beforeAll(async () => {
    gen1ProjFolderName = 'validategen1';
    gen1ProjRoot = await createNewProjectDir(gen1ProjFolderName);

    const { DataSourceMappingOutput } = await createGen1ProjectForMigration(
      gen1ProjFolderName,
      gen1ProjRoot,
      'simple_model_public_auth.graphql',
    );
    dataSourceMapping = JSON.parse(DataSourceMappingOutput);
  });

  beforeEach(async () => {
    gen2ProjFolderName = 'validategen2';
    gen2ProjRoot = await createNewProjectDir(gen2ProjFolderName);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
    await initCDKProject(gen2ProjRoot, templatePath);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(gen2ProjRoot, '--all');
    } catch (_) {
      /* No-op */
    }
    deleteProjectDir(gen2ProjRoot);
  });

  afterAll(async () => {
    try {
      await deleteProject(gen1ProjRoot);
    } catch (_) {
      /* No-op */
    }

    try {
      // Tables are set to retain when migrating from gen 1 to gen 2
      // delete the tables to prevent resource leak after test is complete
      await deleteDDBTables(Object.values(dataSourceMapping));
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(gen1ProjRoot);
  });

  // Test cases for test.each need to be defined before beforeAll.
  // The tests cases need data defined in beforeAll.
  // Define the test name first then get the definition later (after beforeAll).
  // For each test case, there should be a matching key in the test definitions.
  // The test definitions include a schema, overrides, and the expected error messages.
  const testCases = [
    'extraGSIOnGen2',
    'billingMode',
    'keySchema',
    'provisionedThroughput',
    'streamSpecification',
    'sseDescription',
    'deletionProtectionEnabled',
  ];
  type TestCase = [
    // CloudFormfation test definition
    TestDefinition,
    // Overrides to apply to the stack. If empty, no overrides are applied.
    // The overrides should export a function called applyOverrides that takes an AmplifyGraphqlApi object.
    string,
    // Expected CloudFormation error messages
    string[],
  ];
  const getTestDefinition = (testCaseName: string): TestCase => {
    const testDefinitions: Record<string, [TestDefinition, string, string[]]> = {
      extraGSIOnGen2: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String @index
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        '',
        [
          'AttributeDefintions does not match the expected value.\nActual: [{"AttributeName":"id","AttributeType":"S"}]\nExpected: [{"AttributeType":"S","AttributeName":"id"},{"AttributeType":"S","AttributeName":"content"}]',
          'GlobalSecondaryIndexes does not match the expected value.\nActual: undefined\nExpected: [{"IndexName":"todosByContent","KeySchema":[{"AttributeName":"content","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"WriteCapacityUnits":5,"ReadCapacityUnits":5}}]',
        ],
      ],
      billingMode: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        `
          import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
          import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

          export const applyOverrides = (api: AmplifyGraphqlApi): void => {
            const todoTable = api.resources.cfnResources.additionalCfnResources['Todo'];
            todoTable.addOverride('Properties.billingMode', BillingMode.PROVISIONED);
          };
        `,
        [
          'BillingModeSummary does not match the expected value.\nActual: {"BillingMode":"PAY_PER_REQUEST"}\nExpected: {"BillingMode":"PROVISIONED"}',
        ],
      ],
      keySchema: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        `
          import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
          import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

          export const applyOverrides = (api: AmplifyGraphqlApi): void => {
            const todoTable = api.resources.cfnResources.additionalCfnResources['Todo'];
            todoTable.addOverride('Properties.keySchema', [{ attributeName: 'fakekey', keyType: 'HASH' }]);
          };
        `,
        [
          'KeySchema does not match the expected value.\nActual: [{"AttributeName":"id","KeyType":"HASH"}]\nExpected: [{"AttributeName":"fakekey","KeyType":"HASH"}]',
        ],
      ],
      provisionedThroughput: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        `
          import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
          import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

          export const applyOverrides = (api: AmplifyGraphqlApi): void => {
            const todoTable = api.resources.cfnResources.additionalCfnResources['Todo'];
            todoTable.addOverride('Properties.provisionedThroughput', {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            });
          };
        `,
        [
          'ProvisionedThroughput does not match the expected value.\nActual: {"ReadCapacityUnits":0,"WriteCapacityUnits":0}\nExpected: {"WriteCapacityUnits":5,"ReadCapacityUnits":5}',
        ],
      ],
      streamSpecification: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        `
          import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
          import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

          export const applyOverrides = (api: AmplifyGraphqlApi): void => {
            const todoTable = api.resources.cfnResources.additionalCfnResources['Todo'];
            todoTable.addOverride('Properties.streamSpecification', {
              streamViewType: "KEYS_ONLY"
            });
          };
        `,
        [
          'StreamSpecification does not match the expected value.\nActual: {"StreamEnabled":true,"StreamViewType":"NEW_AND_OLD_IMAGES"}\nExpected: {"StreamEnabled":true,"StreamViewType":"KEYS_ONLY"}',
        ],
      ],
      sseDescription: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        '',
        ['SSEDescription does not match the expected value.\nActual: undefined\nExpected: {"SSEType":"KMS","Status":"ENABLED"}'],
      ],
      deletionProtectionEnabled: [
        {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: {
            dbType: 'DYNAMODB' as const,
            provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
            tableName: dataSourceMapping.Todo,
          },
        },
        `
          import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
          import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

          export const applyOverrides = (api: AmplifyGraphqlApi): void => {
            const todoTable = api.resources.cfnResources.additionalCfnResources['Todo'];
            todoTable.addOverride('Properties.deletionProtectionEnabled', true);
          };
        `,
        ['DeletionProtectionEnabled does not match the expected value.\nActual: false\nExpected: true'],
      ],
    };

    return testDefinitions[testCaseName];
  };

  test.each(testCases.map((testCase) => [testCase]))('%s', async (testCaseName) => {
    const [testDefinition, overrides, expectedErrors] = getTestDefinition(testCaseName);
    writeStackConfig(gen2ProjRoot, { prefix: gen2ProjFolderName });
    writeTestDefinitions({ [testCaseName]: testDefinition }, gen2ProjRoot);
    // if no overrides are provided, use the default applyOverrides function (no-op)
    if (overrides) {
      writeOverrides(overrides, gen2ProjRoot);
    }

    // expect to fail with error
    await expect(cdkDeploy(gen2ProjRoot, '--all')).rejects.toThrow();

    // Assert on the failure reason
    const event = await getCreateTableFailEvent(gen2ProjFolderName);
    expect(event.ResourceStatusReason).toContain('Imported table properties did not match the expected table properties.');
    expectedErrors.forEach((error) => {
      expect(event.ResourceStatusReason).toContain(error);
    });
  });
});

/*
 * Get the cloudformation event for the failed table creation.
 * The event will contain the error message for failure.
 */
const getCreateTableFailEvent = async (projFolderName: string): Promise<StackEvent> => {
  const client = new CloudFormationClient({ region: process.env.CLI_REGION || 'us-west-2' });
  const listStacksCommand = new ListStacksCommand({
    StackStatusFilter: ['DELETE_COMPLETE'],
  });
  const stacks = await client.send(listStacksCommand);
  const stack = stacks.StackSummaries?.find(
    (stack) => stack.StackName.startsWith(projFolderName.replace(/_/g, '-')) && stack.StackName.includes('ApiTodoNested'),
  );
  expect(stack).toBeDefined();
  const { StackId } = stack;

  const describeStackEventsCommand = new DescribeStackEventsCommand({ StackName: StackId });
  const stackEvents = await client.send(describeStackEventsCommand);
  const event = stackEvents.StackEvents?.find(
    (event) => event.ResourceType === 'Custom::ImportedAmplifyDynamoDBTable' && event.ResourceStatus === 'CREATE_FAILED',
  );
  expect(event).toBeDefined();

  return event;
};
