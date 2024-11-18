import { Stack, Duration } from 'aws-cdk-lib';
import { FieldLogLevel, CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

// Define default configurations
const defaultLogConfig = {
  fieldLogLevel: FieldLogLevel.NONE,
  excludeVerboseContent: true,
  retention: RetentionDays.ONE_WEEK,
};

// Define test cases
const testCases = [
  {
    description: 'Default - logging: true',
    logging: true,
    expectedLogConfig: {
      fieldLogLevel: defaultLogConfig.fieldLogLevel,
      excludeVerboseContent: defaultLogConfig.excludeVerboseContent,
      expectedRetention: defaultLogConfig.retention,
    },
  },
  {
    description: 'Default - logging: {}',
    logging: {},
    expectedLogConfig: {
      fieldLogLevel: defaultLogConfig.fieldLogLevel,
      excludeVerboseContent: defaultLogConfig.excludeVerboseContent,
      expectedRetention: defaultLogConfig.retention,
    },
  },
  {
    description: 'Custom - fieldLogLevel: ERROR',
    logging: {
      fieldLogLevel: FieldLogLevel.ERROR,
    },
    expectedLogConfig: {
      fieldLogLevel: FieldLogLevel.ERROR,
      excludeVerboseContent: defaultLogConfig.excludeVerboseContent,
      expectedRetention: defaultLogConfig.retention,
    },
  },
  {
    description: 'Custom - retention: ONE_MONTH',
    logging: {
      retention: RetentionDays.ONE_MONTH,
    },
    expectedLogConfig: {
      fieldLogLevel: defaultLogConfig.fieldLogLevel,
      excludeVerboseContent: defaultLogConfig.excludeVerboseContent,
      expectedRetention: RetentionDays.ONE_MONTH,
    },
  },
  {
    description: 'Custom - fieldLogLevel: ALL, excludeVerboseContent: false, retention: TWO_WEEKS',
    logging: {
      fieldLogLevel: FieldLogLevel.ALL,
      excludeVerboseContent: false,
      retention: RetentionDays.TWO_WEEKS,
    },
    expectedLogConfig: {
      fieldLogLevel: FieldLogLevel.ALL,
      excludeVerboseContent: false,
      expectedRetention: RetentionDays.TWO_WEEKS,
    },
  },
  {
    description: 'No logging config',
    logging: undefined,
    expectedLogConfig: undefined,
  },
];

// Helper function to create and test the AmplifyGraphqlApi
const createAndTestApi = (
  stack: Stack,
  logging: any,
  expectedLogConfig: any,
): void => {
  const api = new AmplifyGraphqlApi(stack, 'api', {
    apiName: 'MyApi',
    definition: AmplifyGraphqlDefinition.fromString(`
      type Query {
        dummy: String
      }
    `),
    authorizationModes: {
      defaultAuthorizationMode: 'API_KEY',
      apiKeyConfig: { expires: Duration.days(7) },
    },
    ...(logging !== undefined && { logging }),
  });

  const template = Template.fromStack(stack);

  if (expectedLogConfig) {
    // Verify fieldLogLevel and excludeVerboseContent
    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(expectedLogConfig.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(expectedLogConfig.excludeVerboseContent);

    // Verify retention
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: expectedLogConfig.expectedRetention,
    });
  } else {
    // Verify that no log config is created
    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeUndefined();

    // Verify that no log retention is created
    template.resourcePropertiesCountIs('Custom::LogRetention', 'LogRetention', 0);
  }
};

describe('AmplifyGraphqlApi Log Config', () => {
  test.each(testCases)('$description', ({ logging, expectedLogConfig }) => {
    const stack = new Stack();
    createAndTestApi(stack, logging, expectedLogConfig);
  });
});
