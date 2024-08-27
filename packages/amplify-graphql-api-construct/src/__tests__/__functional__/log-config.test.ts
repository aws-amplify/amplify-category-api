import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { FieldLogLevel } from 'aws-cdk-lib/aws-appsync';
import { CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

const logConfigWithoutRole = {
  fieldLogLevel: FieldLogLevel.ALL,
  excludeVerboseContent: true,
};

const logConfigWithRole = {
  role: {
    roleArn: 'arn:aws:iam::123456789012:role/MyRole',
    roleName: 'MyRole',
  } as IRole,
  fieldLogLevel: FieldLogLevel.ALL,
  excludeVerboseContent: true,
};

describe('log config', () => {
  it('should create a log config with all properties even if we do not pass in a role', () => {
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
      logConfig: logConfigWithoutRole,
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;

    console.log('createdLogConfig', createdLogConfig);

    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toBeDefined();
    expect(createdLogConfig.fieldLogLevel).toEqual(logConfigWithoutRole.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(logConfigWithoutRole.excludeVerboseContent);
  });

  it('should create a log config with the a role passed in', () => {
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
      logConfig: logConfigWithRole,
    });

    const createdLogConfig = api.resources.cfnResources.cfnGraphqlApi.logConfig as CfnGraphQLApi.LogConfigProperty;

    expect(createdLogConfig).toBeDefined();
    expect(createdLogConfig.cloudWatchLogsRoleArn).toEqual(logConfigWithRole.role.roleArn);
    expect(createdLogConfig.fieldLogLevel).toEqual(logConfigWithRole.fieldLogLevel);
    expect(createdLogConfig.excludeVerboseContent).toEqual(logConfigWithRole.excludeVerboseContent);
  });
});
