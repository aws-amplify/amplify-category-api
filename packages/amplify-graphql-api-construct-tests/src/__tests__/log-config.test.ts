import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as AWS from 'aws-sdk';
import { GraphQLClient } from 'graphql-request';
import { AppSyncClient, GetGraphqlApiCommand } from '@aws-sdk/client-appsync';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

const cloudwatchLogs = new AWS.CloudWatchLogs({ region: process.env.CLI_REGION });
const appSyncClient = new AppSyncClient({ region: process.env.CLI_REGION });

const defaultRetentionInDays = 7;
const defaultExcludeVerboseContent = true;
const defaultFieldLogLevel = 'NONE';

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

// Verify that the logs contain the expected request ID in ExecutionSummary log and RequestSummary log
const verifyLogsWithRequestId = async (logGroupName: string, expectedRequestId: string): Promise<void> => {
  // Wait 20 seconds for logs to propagate
  await new Promise((resolve) => setTimeout(resolve, 20000));

  const params = {
    logGroupName: logGroupName,
    filterPattern: `{ $.requestId = "${expectedRequestId}" }`,
  };

  const response = await cloudwatchLogs.filterLogEvents(params).promise();
  // From observation, each request has at least 2 logs that contains the request ID: ExecutionSummary log and RequestSummary log
  // This assertion could fail if anything changes in the logging format
  expect(response.events.length).toBeGreaterThan(1);

  // Verify that there is an "ExecutionSummary" log and a "RequestSummary" log
  const executionSummaryLog = response.events.find((event) => {
    const parsedMessage = JSON.parse(event.message);
    return parsedMessage.logType === 'ExecutionSummary' && parsedMessage.requestId === expectedRequestId;
  });
  const requestSummaryLog = response.events.find((event) => {
    const parsedMessage = JSON.parse(event.message);
    return parsedMessage.logType === 'RequestSummary' && parsedMessage.requestId === expectedRequestId;
  });
  expect(executionSummaryLog).toBeDefined();
  expect(requestSummaryLog).toBeDefined();

  // Additional check to ensure both logs have the expected request ID
  expect(JSON.parse(executionSummaryLog.message).requestId).toBe(expectedRequestId);
  expect(JSON.parse(requestSummaryLog.message).requestId).toBe(expectedRequestId);
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

  beforeEach(async () => {
    projFolderName = 'log-config';
    projRoot = await createNewProjectDir(projFolderName);
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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
    const name = await initCDKProject(projRoot, templatePath, {
      cdkContext: {
        logging: '{}', // TODO: will it take away the ''?
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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'log-config'));
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