import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { AmplifyAppSyncSimulatorAuthenticationType, AppSyncGraphQLExecutionContext } from '@aws-amplify/amplify-appsync-simulator';
import { testTransform, DeploymentResources } from '@aws-amplify/graphql-transformer-test-utils';
import { VelocityTemplateSimulator, AppSyncVTLContext, getIAMToken } from '../../velocity';

type TestTransform = {
  transform: (schema: string) => DeploymentResources;
};

jest.mock('@aws-amplify/amplify-prompts');

describe('admin roles query checks', () => {
  const ADMIN_UI_ROLE = 'us-fake-1_uuid_Full-access/CognitoIdentityCredentials';
  const MOCK_BEFORE_TEMPLATE = `$util.qr($ctx.stash.put("adminRoles", ["${ADMIN_UI_ROLE}"]))`;

  let vtlTemplate: VelocityTemplateSimulator;
  let transformer: TestTransform;
  const adminFullAccessRequest: AppSyncGraphQLExecutionContext = {
    requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.AWS_IAM,
    iamToken: getIAMToken('us-fake-1_uuid_Full-access'),
    headers: {},
  };

  beforeEach(() => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    };
    transformer = {
      transform: (schema: string) =>
        testTransform({
          schema,
          authConfig,
          synthParameters: { adminRoles: [ADMIN_UI_ROLE] },
          transformers: [new ModelTransformer(), new AuthTransformer()],
        }),
    };

    vtlTemplate = new VelocityTemplateSimulator({ authConfig });
  });

  test('schema with field auth', () => {
    const validSchema = `
      type Student @model @auth(rules: [{ allow: groups, groups: ["staff"] }, { allow: owner }]) {
        id: ID!
        name: String
        description: String
        secretValue: String @auth(rules: [{ allow: owner }])
      }`;
    const out = transformer.transform(validSchema);

    // field resolver
    const secretValueTemplate = [MOCK_BEFORE_TEMPLATE, out.resolvers['Student.secretValue.req.vtl']].join('\n');
    const iamFieldContext: AppSyncVTLContext = {
      source: {
        secretValue: 'secretValue001',
      },
    };

    const secretValueResponse = vtlTemplate.render(secretValueTemplate, {
      context: iamFieldContext,
      requestParameters: adminFullAccessRequest,
    });
    expect(secretValueResponse.hadException).toEqual(false);
    expect(secretValueResponse.result).toEqual('secretValue001');

    // mutation resolver
    const createStudentTemplate = [MOCK_BEFORE_TEMPLATE, out.resolvers['Mutation.createStudent.auth.1.req.vtl']].join('\n');
    const iamCreateContext: AppSyncVTLContext = {
      arguments: {
        input: {
          id: '001',
          name: 'student0',
          owner: 'student0',
        },
      },
    };
    const createStudentResponse = vtlTemplate.render(createStudentTemplate, {
      context: iamCreateContext,
      requestParameters: adminFullAccessRequest,
    });

    expect(createStudentResponse.hadException).toEqual(false);
    // we can exit early with a object since the next function will run the mutation request
    expect(createStudentResponse.result).toEqual('{}');
  });
});

describe('admin role identity matching', () => {
  const ADMIN_ROLE_NAME = 'myappLambdaRoleaf16b2c3-dev';
  const ADMIN_UI_ROLE = 'us-fake-1_uuid_Full-access/CognitoIdentityCredentials';
  const validSchema = `
    type Student @model @auth(rules: [{ allow: groups, groups: ["staff"] }, { allow: owner }]) {
      id: ID!
      name: String
      description: String
      secretValue: String @auth(rules: [{ allow: owner }])
    }`;

  let vtlTemplate: VelocityTemplateSimulator;
  let secretValueResolver: string;

  const renderAsCaller = (adminRoles: Array<string>, userArn: string): ReturnType<VelocityTemplateSimulator['render']> => {
    const template = [`$util.qr($ctx.stash.put("adminRoles", ${JSON.stringify(adminRoles)}))`, secretValueResolver].join('\n');
    const iamFieldContext: AppSyncVTLContext = { source: { secretValue: 'secretValue001' } };
    const requestParameters: AppSyncGraphQLExecutionContext = {
      requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.AWS_IAM,
      iamToken: { ...getIAMToken('caller'), userArn },
      headers: {},
    };
    return vtlTemplate.render(template, { context: iamFieldContext, requestParameters });
  };

  beforeEach(() => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    };
    secretValueResolver = testTransform({
      schema: validSchema,
      authConfig,
      synthParameters: { adminRoles: [ADMIN_ROLE_NAME] },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    }).resolvers['Student.secretValue.req.vtl'];

    vtlTemplate = new VelocityTemplateSimulator({ authConfig });
  });

  test('authorizes a caller whose assumed role name is an admin role, whatever its session name', () => {
    const response = renderAsCaller([ADMIN_ROLE_NAME], `arn:aws:sts::123456789012:assumed-role/${ADMIN_ROLE_NAME}/myFunc-dev`);

    expect(response.hadException).toEqual(false);
    expect(response.result).toEqual('secretValue001');
  });

  test('authorizes an admin ui caller matched on both its role and session name', () => {
    const response = renderAsCaller([ADMIN_UI_ROLE], `arn:aws:sts::123456789012:assumed-role/${ADMIN_UI_ROLE}`);

    expect(response.hadException).toEqual(false);
    expect(response.result).toEqual('secretValue001');
  });

  test('denies a caller whose session name matches an admin role name', () => {
    const response = renderAsCaller([ADMIN_ROLE_NAME], `arn:aws:sts::123456789012:assumed-role/UnrelatedRole/${ADMIN_ROLE_NAME}`);

    expect(response.hadException).toEqual(true);
    expect(response.result).not.toEqual('secretValue001');
  });

  test('denies a caller whose session name matches a qualified admin role entry', () => {
    const response = renderAsCaller([ADMIN_UI_ROLE], `arn:aws:sts::123456789012:assumed-role/UnrelatedRole/${ADMIN_UI_ROLE}`);

    expect(response.hadException).toEqual(true);
    expect(response.result).not.toEqual('secretValue001');
  });

  test('denies a caller whose assumed role name merely ends with an admin role name', () => {
    const response = renderAsCaller([ADMIN_ROLE_NAME], `arn:aws:sts::123456789012:assumed-role/unrelated${ADMIN_ROLE_NAME}/session`);

    expect(response.hadException).toEqual(true);
    expect(response.result).not.toEqual('secretValue001');
  });

  test('denies a caller whose assumed role name merely starts with an admin role name', () => {
    const response = renderAsCaller([ADMIN_ROLE_NAME], `arn:aws:sts::123456789012:assumed-role/${ADMIN_ROLE_NAME}Extra/session`);

    expect(response.hadException).toEqual(true);
    expect(response.result).not.toEqual('secretValue001');
  });

  test('denies an iam user caller that cannot present an assumed role identity', () => {
    const response = renderAsCaller([ADMIN_ROLE_NAME], `arn:aws:iam::123456789012:user/${ADMIN_ROLE_NAME}`);

    expect(response.hadException).toEqual(true);
    expect(response.result).not.toEqual('secretValue001');
  });
});

describe('identity claim feature flag disabled', () => {
  describe('admin roles query checks', () => {
    const ADMIN_UI_ROLE = 'us-fake-1_uuid_Full-access/CognitoIdentityCredentials';
    const MOCK_BEFORE_TEMPLATE = `$util.qr($ctx.stash.put("adminRoles", ["${ADMIN_UI_ROLE}"]))`;

    let vtlTemplate: VelocityTemplateSimulator;
    let transformer: TestTransform;
    const adminFullAccessRequest: AppSyncGraphQLExecutionContext = {
      requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.AWS_IAM,
      iamToken: getIAMToken('us-fake-1_uuid_Full-access'),
      headers: {},
    };

    beforeEach(() => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      };
      transformer = {
        transform: (schema: string) =>
          testTransform({
            schema,
            authConfig,
            synthParameters: { adminRoles: [ADMIN_UI_ROLE] },
            transformers: [new ModelTransformer(), new AuthTransformer()],
          }),
      };

      vtlTemplate = new VelocityTemplateSimulator({ authConfig });
    });

    test('schema with field auth', () => {
      const validSchema = `
        type Student @model @auth(rules: [{ allow: groups, groups: ["staff"] }, { allow: owner }]) {
          id: ID!
          name: String
          description: String
          secretValue: String @auth(rules: [{ allow: owner }])
        }`;
      const out = transformer.transform(validSchema);

      // field resolver
      const secretValueTemplate = [MOCK_BEFORE_TEMPLATE, out.resolvers['Student.secretValue.req.vtl']].join('\n');
      const iamFieldContext: AppSyncVTLContext = {
        source: {
          secretValue: 'secretValue001',
        },
      };

      const secretValueResponse = vtlTemplate.render(secretValueTemplate, {
        context: iamFieldContext,
        requestParameters: adminFullAccessRequest,
      });
      expect(secretValueResponse.hadException).toEqual(false);
      expect(secretValueResponse.result).toEqual('secretValue001');

      // mutation resolver
      const createStudentTemplate = [MOCK_BEFORE_TEMPLATE, out.resolvers['Mutation.createStudent.auth.1.req.vtl']].join('\n');
      const iamCreateContext: AppSyncVTLContext = {
        arguments: {
          input: {
            id: '001',
            name: 'student0',
            owner: 'student0',
          },
        },
      };
      const createStudentResponse = vtlTemplate.render(createStudentTemplate, {
        context: iamCreateContext,
        requestParameters: adminFullAccessRequest,
      });

      expect(createStudentResponse.hadException).toEqual(false);
      // we can exit early with a object since the next function will run the mutation request
      expect(createStudentResponse.result).toEqual('{}');
    });
  });
});
