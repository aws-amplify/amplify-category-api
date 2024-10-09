import { Stack, Duration } from 'aws-cdk-lib';
import { FieldLogLevel, CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

const defaultLogConfig = {
  fieldLogLevel: FieldLogLevel.NONE,
  excludeVerboseContent: true,
};

const defaultRetention = RetentionDays.ONE_WEEK;

describe('log config', () => {
  it('should create a default log config if logging is set to true', () => {
    const stack = new Stack();

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
      logging: true,
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(defaultLogConfig.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(defaultLogConfig.excludeVerboseContent);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: defaultRetention,
    });
  });

  it('should create a default log config if logging is set to an empty object', () => {
    const stack = new Stack();

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
      logging: {},
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(defaultLogConfig.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(defaultLogConfig.excludeVerboseContent);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: defaultRetention,
    });
  });

  it('should create a log config with a specified fieldLogLevel, a default excludeVerboseContent, and a default retention', () => {
    const stack = new Stack();

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
      logging: {
        fieldLogLevel: FieldLogLevel.ERROR,
      },
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(FieldLogLevel.ERROR);
    expect(createdLogConfig.excludeVerboseContent).toEqual(defaultLogConfig.excludeVerboseContent);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: defaultRetention,
    });
  });

  it('should create a log config with a default fieldLogLevel, a default excludeVerboseContent, and a specified retention', () => {
    const stack = new Stack();

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
      logging: {
        retention: RetentionDays.ONE_MONTH,
      },
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(defaultLogConfig.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(defaultLogConfig.excludeVerboseContent);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: RetentionDays.ONE_MONTH,
    });
  });

  it('should create a log config with all of fieldLogLevel, excludeVerboseContent, and retention specified', () => {
    const stack = new Stack();

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
      logging: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: false,
        retention: RetentionDays.TWO_WEEKS,
      },
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(FieldLogLevel.ALL);
    expect(createdLogConfig.excludeVerboseContent).toEqual(false);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: RetentionDays.TWO_WEEKS,
    });
  });

  it('should not create a log config when logging is not specified', () => {
    const stack = new Stack();

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
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeUndefined();
  });
});
