import { Stack } from 'aws-cdk-lib';
import { FieldLogLevel, CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Template } from 'aws-cdk-lib/assertions';
import { GraphQLApi } from '../../graphql-api';
import { AssetProvider } from '../../../../amplify-graphql-api-construct/src/internal';

const defaultLogConfig = {
  fieldLogLevel: FieldLogLevel.NONE,
  excludeVerboseContent: true,
};

const defaultRetention = RetentionDays.ONE_WEEK;

describe('log config', () => {
  it('should create a default log config if logging is set to true', () => {
    const stack = new Stack();

    const api = new GraphQLApi(stack, 'api', {
      name: 'MyApi',
      assetProvider: new AssetProvider(stack),
      logging: true,
    });

    const cfnApi = api.node.findChild('Resource') as CfnGraphQLApi;
    const createdLogConfig = cfnApi.logConfig as CfnGraphQLApi.LogConfigProperty;
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

    const api = new GraphQLApi(stack, 'api', {
      name: 'MyApi',
      assetProvider: new AssetProvider(stack),
      logging: {},
    });

    const cfnApi = api.node.findChild('Resource') as CfnGraphQLApi;
    const createdLogConfig = cfnApi.logConfig as CfnGraphQLApi.LogConfigProperty;
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

    const api = new GraphQLApi(stack, 'api', {
      name: 'MyApi',
      assetProvider: new AssetProvider(stack),
      logging: {
        fieldLogLevel: FieldLogLevel.ERROR,
      },
    });

    const cfnApi = api.node.findChild('Resource') as CfnGraphQLApi;
    const createdLogConfig = cfnApi.logConfig as CfnGraphQLApi.LogConfigProperty;
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

    const api = new GraphQLApi(stack, 'api', {
      name: 'MyApi',
      assetProvider: new AssetProvider(stack),
      logging: {
        retention: RetentionDays.ONE_MONTH,
      },
    });

    const cfnApi = api.node.findChild('Resource') as CfnGraphQLApi;
    const createdLogConfig = cfnApi.logConfig as CfnGraphQLApi.LogConfigProperty;
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

    const api = new GraphQLApi(stack, 'api', {
      name: 'MyApi',
      assetProvider: new AssetProvider(stack),
      logging: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: false,
        retention: RetentionDays.TWO_WEEKS,
      },
    });

    const cfnApi = api.node.findChild('Resource') as CfnGraphQLApi;
    const createdLogConfig = cfnApi.logConfig as CfnGraphQLApi.LogConfigProperty;
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

    const api = new GraphQLApi(stack, 'api', {
      name: 'MyApi',
      assetProvider: new AssetProvider(stack),
    });

    const cfnApi = api.node.findChild('Resource') as CfnGraphQLApi;
    const createdLogConfig = cfnApi.logConfig as CfnGraphQLApi.LogConfigProperty;
    expect(createdLogConfig).toBeUndefined();

    const template = Template.fromStack(stack);
    template.resourcePropertiesCountIs('Custom::LogRetention', 'LogRetention', 0);
  });
});
