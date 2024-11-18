import * as path from 'path';
import { AppSyncClient, GetGraphqlApiCommand } from '@aws-sdk/client-appsync';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  LiveTailSessionLogEvent,
  StartLiveTailCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { default as STS } from 'aws-sdk/clients/sts';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { GraphQLClient } from 'graphql-request';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { DURATION_30_MINUTES } from '../utils/duration-constants';

jest.setTimeout(DURATION_30_MINUTES);

// AWS client initialization
const region = process.env.CLI_REGION;
const cloudWatchLogsClient = new CloudWatchLogsClient({ region });
const appSyncClient = new AppSyncClient({ region });
const sts = new STS({ region });

// Log config shape
type LogConfigShape = { retention?: number; excludeVerboseContent?: boolean; fieldLogLevel?: string };

// Default configuration constants
const defaultLogConfig = {
  retention: 7,
  excludeVerboseContent: true,
  fieldLogLevel: 'NONE',
};

// Test query
const query = /* GraphQL */ `
  mutation CreateTodo {
    createTodo(input: { name: "Test Todo", description: "This is a test todo" }) {
      id
      name
      description
      complete
    }
  }
`;

// Utility functions
const getAccountId = async (): Promise<string> => {
  try {
    const accountDetails = await sts.getCallerIdentity({}).promise();
    return accountDetails?.Account;
  } catch (e) {
    console.warn(`Could not get current AWS account ID: ${e}`);
    expect(true).toEqual(false);
  }
};

// Verify that logging is configured correctly
const verifyLogConfig = async (logGroupName: string, apiId: string, expectedLogConfig: LogConfigShape): Promise<void> => {
  // Verify CloudWatch log group retentionInDays setting
  const describeLogGroupsParams = {
    logGroupNamePrefix: logGroupName,
  };
  const describeLogGroupsCommand = new DescribeLogGroupsCommand(describeLogGroupsParams);
  const cloudWatchResponse = await cloudWatchLogsClient.send(describeLogGroupsCommand);
  const logGroup = cloudWatchResponse.logGroups.find((lg) => lg.logGroupName === logGroupName);
  expect(logGroup).toBeDefined();
  expect(logGroup.retentionInDays).toBe(expectedLogConfig.retention);

  // Verify AppSync API log excludeVerboseContent and fieldLogLevel settings
  const appSyncParams = {
    apiId: apiId,
  };
  const appSyncResponse = await appSyncClient.send(new GetGraphqlApiCommand(appSyncParams));
  const logConfig = appSyncResponse.graphqlApi?.logConfig;
  expect(logConfig).toBeDefined();
  expect(logConfig.excludeVerboseContent).toBe(expectedLogConfig.excludeVerboseContent);
  expect(logConfig.fieldLogLevel).toBe(expectedLogConfig.fieldLogLevel);
};

// Get the log event with the expected request ID
const getLogEventWithRequestId = async (logGroupName: string, expectedRequestId: string): Promise<LiveTailSessionLogEvent> => {
  // Set up for StartLiveTailCommand
  const accountId = await getAccountId();
  const logGroupArn = `arn:aws:logs:${region}:${accountId}:log-group:${logGroupName}`;
  const startLiveTailParams = {
    logGroupIdentifiers: [logGroupArn],
    logEventFilterPattern: `{ $.requestId = "${expectedRequestId}" }`,
  };

  const startLiveTailCommand = new StartLiveTailCommand(startLiveTailParams);
  const cloudWatchResponse = await cloudWatchLogsClient.send(startLiveTailCommand);

  for await (const event of cloudWatchResponse.responseStream) {
    // Every second, a LiveTailSessionUpdate object is sent. Each of these objects contains an array of the actual log events.
    // If no new log events were ingested in the past second, the LiveTailSessionUpdate object will contain an empty array.
    // source: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cloudwatch-logs/command/StartLiveTailCommand/
    if (event.sessionUpdate && event.sessionUpdate.sessionResults.length > 0) {
      return event.sessionUpdate.sessionResults[0];
    }
  }
};

// Verify that the log group does not exist
const verifyLogGroupDoesNotExist = async (logGroupName: string): Promise<void> => {
  const describeLogGroupsParams = {
    logGroupNamePrefix: logGroupName,
  };
  const describeLogGroupsCommand = new DescribeLogGroupsCommand(describeLogGroupsParams);
  const cloudWatchResponse = await cloudWatchLogsClient.send(describeLogGroupsCommand);
  const logGroup = cloudWatchResponse.logGroups.find((lg) => lg.logGroupName === logGroupName);
  expect(logGroup).toBeUndefined();
};

/**
 * To pass logging config to the AmplifyGraphqlApi construct, the underlying values are used and later mapped to the corresponding
 * enum values in packages/amplify-graphql-api-construct-tests/src/__tests__/backends/log-config/app.ts.
 *
 * For example:
 * - logging: '{"retention": 60}' is parsed to { retention: RetentionDays.TWO_MONTHS }
 * - logging: '{"fieldLogLevel": "ERROR"}' is parsed to { fieldLogLevel: FieldLogLevel.ERROR }
 */
describe('Log Config Tests', () => {
  const projRoots: string[] = [];

  afterAll(async () => {
    const destroyCDKProjectAndDeleteProjectDir = async (projRoot: string): Promise<void> => {
      await cdkDestroy(projRoot, '--all');
      deleteProjectDir(projRoot);
    };
    const cleanupTasks = projRoots.map((projRoot) => destroyCDKProjectAndDeleteProjectDir(projRoot));
    await Promise.all(cleanupTasks);
  });

  const testCases: [
    string,
    {
      logging: true | LogConfigShape;
      expectedLogConfig: LogConfigShape;
    },
  ][] = [
    [
      'Default - logging: true',
      {
        logging: true,
        expectedLogConfig: defaultLogConfig,
      },
    ],
    [
      'Default - logging: {}',
      {
        logging: {},
        expectedLogConfig: defaultLogConfig,
      },
    ],
    [
      'Custom - fieldLogLevel: ERROR',
      {
        logging: { fieldLogLevel: 'ERROR' },
        expectedLogConfig: { ...defaultLogConfig, fieldLogLevel: 'ERROR' },
      },
    ],
    [
      'Custom - retention: 60',
      {
        logging: { retention: 60 },
        expectedLogConfig: { ...defaultLogConfig, retention: 60 },
      },
    ],
    [
      'Custom - fieldLogLevel: INFO, excludeVerboseContent: false, retention: 365',
      {
        logging: { retention: 365, excludeVerboseContent: false, fieldLogLevel: 'INFO' },
        expectedLogConfig: { retention: 365, excludeVerboseContent: false, fieldLogLevel: 'INFO' },
      },
    ],
  ];

  test.concurrent.each(testCases)('Log Config is enabled with: %s', async (_, { logging, expectedLogConfig }) => {
    const projRoot = await createNewProjectDir('log-config');
    projRoots.push(projRoot);
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));

    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: JSON.stringify(logging),
      },
    });

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    const logGroupName = `/aws/appsync/apis/${apiId}`;

    // Create a GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Run a query
    const { headers } = await client.rawRequest(query);
    const requestId = headers.get('x-amzn-requestid');

    // Verify request ID in log
    const logEvent = await getLogEventWithRequestId(logGroupName, requestId);
    expect(logEvent).toBeDefined();

    // Verify logging configuration
    await verifyLogConfig(logGroupName, apiId, expectedLogConfig);
  });

  test('Logging is disabled', async () => {
    const projRoot = await createNewProjectDir('log-config');
    projRoots.push(projRoot);
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));

    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath);

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Run a query
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });
    await client.rawRequest(query);

    // Verify that logging is disabled
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogGroupDoesNotExist(logGroupName);
  });
});
