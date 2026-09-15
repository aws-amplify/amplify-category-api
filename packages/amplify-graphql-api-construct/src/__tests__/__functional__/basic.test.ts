import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('basic functionality', () => {
  it('renders an appsync api', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphqlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'MyApi',
    });

    template.resourceCountIs('AWS::AppSync::DataSource', 1);
    template.hasResourceProperties('AWS::AppSync::DataSource', {
      Name: 'NONE_DS',
      Type: 'NONE',
    });
  });

  it('renders a conflict resolution table when enabled', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
      conflictResolution: {
        project: {
          detectionType: 'VERSION',
          handlerType: 'OPTIMISTIC_CONCURRENCY',
        },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'ds_pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'ds_sk',
          KeyType: 'RANGE',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'ds_pk',
          AttributeType: 'S',
        },
        {
          AttributeName: 'ds_sk',
          AttributeType: 'S',
        },
      ],
    });
  });

  it('uses the id in place of apiName when not specified', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'TestApi',
    });
  });

  it('generates a nested stack per-model and for connections', () => {
    const stack = new cdk.Stack();
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Blog @model @auth(rules: [{ allow: public }]) {
          title: String!
          posts: [Post] @hasMany
        }

        type Post @model @auth(rules: [{ allow: public }]) {
          title: String!
          blog: Blog @belongsTo
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.resources.nestedStacks.Blog).toBeDefined();
    const blogTemplate = Template.fromStack(api.resources.nestedStacks.Blog);
    expect(blogTemplate).toBeDefined();

    expect(api.resources.nestedStacks.Post).toBeDefined();
    const postTemplate = Template.fromStack(api.resources.nestedStacks.Post);
    expect(postTemplate).toBeDefined();

    expect(api.resources.nestedStacks.ConnectionStack).toBeDefined();
    const connectionTemplate = Template.fromStack(api.resources.nestedStacks.ConnectionStack);
    expect(connectionTemplate).toBeDefined();
  });

  it('throws if multiple apis are attached to the same parent stack', () => {
    const stack = new cdk.Stack();

    const definition = AmplifyGraphqlDefinition.fromString('type Todo @model @auth(rules: [{ allow: public }]) { id: ID! }');
    const authorizationModes = { apiKeyConfig: { expires: cdk.Duration.days(7) } };

    new AmplifyGraphqlApi(stack, 'TestApi1', { definition, authorizationModes });

    expect(() => new AmplifyGraphqlApi(stack, 'TestApi2', { definition, authorizationModes })).toThrowErrorMatchingInlineSnapshot(
      `"Only one AmplifyGraphqlApi is expected in a stack. Place the AmplifyGraphqlApis in separate nested stacks."`,
    );
  });

  it('allows multiple apis are attached to the same root stack within nested stacks', () => {
    const stack = new cdk.Stack();
    const nested1 = new cdk.NestedStack(stack, 'Nested1');
    const nested2 = new cdk.NestedStack(stack, 'Nested2');

    const definition = AmplifyGraphqlDefinition.fromString('type Todo @model @auth(rules: [{ allow: public }]) { id: ID! }');
    const authorizationModes = { apiKeyConfig: { expires: cdk.Duration.days(7) } };

    new AmplifyGraphqlApi(nested1, 'TestApi1', { definition, authorizationModes });

    expect(() => new AmplifyGraphqlApi(nested2, 'TestApi2', { definition, authorizationModes })).not.toThrow();
  });

  it('allows multiple cdk pipeline stages', () => {
    class BackendStack extends cdk.Stack {
      constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const definition = AmplifyGraphqlDefinition.fromString('type Todo @model @auth(rules: [{ allow: public }]) { id: ID! }');
        const authorizationModes = { apiKeyConfig: { expires: cdk.Duration.days(7) } };
        new AmplifyGraphqlApi(this, 'MyGraphqlApi', {
          definition,
          authorizationModes,
        });
      }
    }
    class MyApplication extends cdk.Stage {
      constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        new BackendStack(this, 'MyBackendStack');
      }
    }
    class MyPipelineStack extends cdk.Stack {
      constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const pipeline = new cdk.pipelines.CodePipeline(this, 'Pipeline', {
          synth: new cdk.pipelines.ShellStep('Synth', {
            input: cdk.pipelines.CodePipelineSource.gitHub('OWNER/REPO', 'main'),
            commands: ['npx cdk synth'],
          }),
        });

        pipeline.addStage(new MyApplication(this, 'stageone'));

        pipeline.addStage(new MyApplication(this, 'stagetwo'));
      }
    }
    expect(() => new MyPipelineStack(new cdk.App(), 'MyPipelineStack', {})).not.toThrow();
  });
});
