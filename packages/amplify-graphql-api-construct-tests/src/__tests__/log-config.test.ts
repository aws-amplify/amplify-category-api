import * as path from 'path';
import * as AWS from 'aws-sdk';
import { AbortController } from '@aws-sdk/abort-controller';
import { AppSyncClient, GetGraphqlApiCommand } from '@aws-sdk/client-appsync';
import { CloudWatchLogsClient, StartLiveTailCommand } from '@aws-sdk/client-cloudwatch-logs';
import { default as STS } from 'aws-sdk/clients/sts';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { GraphQLClient } from 'graphql-request';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

// AWS client initialization
const region = process.env.CLI_REGION;
const cloudwatchLogs = new AWS.CloudWatchLogs({ region });
const appSyncClient = new AppSyncClient({ region });
const sts = new STS();

// Default configuration constants
const defaultRetentionInDays = 7;
const defaultExcludeVerboseContent = true;
const defaultFieldLogLevel = 'NONE';

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
const verifyLogConfig = async (
  logGroupName: string,
  apiId: string,
  expectedRetentionInDays: number,
  expectedExcludeVerboseContent: boolean,
  expectedFieldLogLevel: string,
): Promise<void> => {
  // Verify CloudWatch log group retentionInDays setting
  const cloudWatchParams = {
    logGroupNamePrefix: logGroupName,
  };
  const cloudWatchResponse = await cloudwatchLogs.describeLogGroups(cloudWatchParams).promise();
  const logGroup = cloudWatchResponse.logGroups.find((lg) => lg.logGroupName === logGroupName);
  expect(logGroup).toBeDefined();
  expect(logGroup.retentionInDays).toBe(expectedRetentionInDays);

  // Verify AppSync API log excludeVerboseContent and fieldLogLevel settings
  const appSyncParams = {
    apiId: apiId,
  };
  const appSyncResponse = await appSyncClient.send(new GetGraphqlApiCommand(appSyncParams));
  const logConfig = appSyncResponse.graphqlApi?.logConfig;
  expect(logConfig).toBeDefined();
  expect(logConfig.excludeVerboseContent).toBe(expectedExcludeVerboseContent);
  expect(logConfig.fieldLogLevel).toBe(expectedFieldLogLevel);
};

// Verify that the first log event contains the expected request ID
const verifyLogsWithRequestId = async (logGroupName: string, expectedRequestId: string): Promise<void> => {
  const accountId = await getAccountId();
  const logGroupArn = `arn:aws:logs:${region}:${accountId}:log-group:${logGroupName}`;

  const client = new CloudWatchLogsClient();

  const input = {
    logGroupIdentifiers: [logGroupArn],
    logEventFilterPattern: `{ $.requestId = "${expectedRequestId}" }`,
  };

  // Set up an AbortController with a timeout for the for loop
  const abortController = new AbortController();
  const timeoutDuration = 60000; // 60 seconds
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutDuration);

  try {
    const command = new StartLiveTailCommand(input);
    const response = await client.send(command, { abortSignal: abortController.signal });

    let eventFound = false;
    for await (const event of response.responseStream) {
      if (event.sessionStart) {
        console.log('Live Tail session started:', event.sessionStart);
      } else if (event.sessionUpdate) {
        console.log('Finding log event with the expected request ID');
        const firstLogEvent = event.sessionUpdate.sessionResults.find((logEvent) =>
          logEvent.message.includes(expectedRequestId)
        );
        if (firstLogEvent) {
          expect(firstLogEvent.message).toContain(expectedRequestId);
          console.log('Log event found');
          eventFound = true;
          break;
        }
        console.log('Log event not found, for loop continuing');
      } else {
        console.error('Unknown event type:', event);
      }
    }

    clearTimeout(timeoutId);

    if (!eventFound) {
      throw new Error(`Expected log event with requestId ${expectedRequestId} was not found within the timeout.`);
    }
  } catch (err) {
    console.error('Error processing response stream:', err);
  }
};

// Verify that the log group does not exist
const verifyLogGroupDoesNotExist = async (logGroupName: string): Promise<void> => {
  const cloudWatchParams = {
    logGroupNamePrefix: logGroupName,
  };
  const cloudWatchResponse = await cloudwatchLogs.describeLogGroups(cloudWatchParams).promise();
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
  let projRoot: string;
  let projFolderName: string;
  let templatePath: string;

  beforeEach(async () => {
    projFolderName = 'log-config';
    projRoot = await createNewProjectDir(projFolderName);
    templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('Default logging is enabled with logging: true', async () => {
    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: 'true',
      },
    });

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Verify logging configuration
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogConfig(logGroupName, apiId, defaultRetentionInDays, defaultExcludeVerboseContent, defaultFieldLogLevel);

    // Create a GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Verify request ID in log
    const { headers } = await client.rawRequest(query);
    const requestId = headers.get('x-amzn-requestid');
    await verifyLogsWithRequestId(logGroupName, requestId);
  });

  test('Default logging is enabled with logging: {}', async () => {
    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: '{}',
      },
    });

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Verify logging configuration
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogConfig(logGroupName, apiId, defaultRetentionInDays, defaultExcludeVerboseContent, defaultFieldLogLevel);

    // Create a GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Verify request ID in log
    const { headers } = await client.rawRequest(query);
    const requestId = headers.get('x-amzn-requestid');
    await verifyLogsWithRequestId(logGroupName, requestId);
  });

  test('Custom logging is enabled with fieldLogLevel: ERROR, default excludeVerboseContent, and default retention', async () => {
    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: '{"fieldLogLevel": "ERROR"}',
      },
    });

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Verify logging configuration
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogConfig(logGroupName, apiId, defaultRetentionInDays, defaultExcludeVerboseContent, 'ERROR');

    // Create a GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Verify request ID in log
    const { headers } = await client.rawRequest(query);
    const requestId = headers.get('x-amzn-requestid');
    await verifyLogsWithRequestId(logGroupName, requestId);
  });

  test('Custom logging is enabled with default fieldLogLevel, default excludeVerboseContent, and retention: 60', async () => {
    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: '{"retention": 60}',
      },
    });

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Verify logging configuration
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogConfig(logGroupName, apiId, 60, defaultExcludeVerboseContent, defaultFieldLogLevel);

    // Create a GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Verify request ID in log
    const { headers } = await client.rawRequest(query);
    const requestId = headers.get('x-amzn-requestid');
    await verifyLogsWithRequestId(logGroupName, requestId);
  });

  test('Custom logging is enabled with fieldLogLevel: INFO, excludeVerboseContent: false, and retention: 365', async () => {
    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: '{"retention": 365, "excludeVerboseContent": false, "fieldLogLevel": "INFO"}',
      },
    });

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Verify logging configuration
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogConfig(logGroupName, apiId, 365, false, 'INFO');

    // Create a GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Verify request ID in log
    const { headers } = await client.rawRequest(query);
    const requestId = headers.get('x-amzn-requestid');
    await verifyLogsWithRequestId(logGroupName, requestId);
  });

  test('Logging is disabled', async () => {
    // Initialize CDK project
    const name = await initCDKProject(projRoot, templatePath);

    // Deploy CDK stack
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey, awsAppsyncApiId: apiId } = outputs[name];

    // Verify that logging is disabled
    const logGroupName = `/aws/appsync/apis/${apiId}`;
    await verifyLogGroupDoesNotExist(logGroupName);

    // Run a query
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });
    await client.rawRequest(query);

    // Verify that the log group does not exist
    await verifyLogGroupDoesNotExist(logGroupName);
  });
});
