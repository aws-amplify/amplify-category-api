import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { FieldLogLevel, CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync'; 
// import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

// const emptyLogConfig = {};

// const logConfigWithoutRole = {
//   fieldLogLevel: FieldLogLevel.ALL,
//   excludeVerboseContent: true,
// };

const defaultLogConfig = {
  fieldLogLevel: FieldLogLevel.NONE,
  excludeVerboseContent: true,
};

// const defaultRetention = RetentionDays.ONE_WEEK;

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
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
      logging: true,
    });

    console.log(api.resources.cfnResources.cfnGraphqlApi);

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;

    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(defaultLogConfig.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(defaultLogConfig.excludeVerboseContent);
  });
});
