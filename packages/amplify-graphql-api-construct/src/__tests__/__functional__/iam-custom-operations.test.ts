import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * This tests the CDK construct interface for enabling IAM authorization mode by default for Gen 2 and ensures that it properly applies to
 * custom operations. Further, it asserts that the policies created by the transformers are properly scoped, and never include references to
 * the custom operations. This is especially important for configurations that include a Cognito Identity Pool--the Identity Pool auth and
 * unauth roles should not be granted access to the custom operations unless explicitly allowed.
 */
describe('Custom operations have @aws_iam directives when enableIamAuthorizationMode is true', () => {
  it('Correctly scopes policies when a user pool is present', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ provider: userPools, allow: owner }]) {
          description: String!
        }
        type Query {
          getFooCustom: String
        }
        type Mutation {
          updateFooCustom: String
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `),
      authorizationModes: {
        defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: { userPool },
        iamConfig: { enableIamAuthorizationMode: true },
      },
    });

    const template = Template.fromStack(stack);

    // We do not expect any policy statements relating to the GraphQL API, since no policy was created by the customer. We'll do a string
    // match across all roles & policies as a brute-force way of ensuring that nothing is granting access to the custom operations. We
    // search policies directly, and also roles to make sure we get inline policies attached to the roles.
    const allRoles = template.findResources('AWS::IAM::Role');
    const allRolesString = JSON.stringify(allRoles);
    expect(allRolesString).not.toContain('appsync:GraphQL');

    const allPolicies = template.findResources('AWS::IAM::Policy');
    const allPoliciesString = JSON.stringify(allPolicies);
    expect(allPoliciesString).not.toContain('appsync:GraphQL');

    // There should be no managed policies at all since we didn't include an Identity Pool
    const allManagedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
    expect(allManagedPolicies).toStrictEqual({});
  });

  it('Correctly handles no-model cases', () => {
    const stack = new cdk.Stack();

    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          getFooCustom: String
        }
        type Mutation {
          updateFooCustom: String
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `),
      authorizationModes: {
        iamConfig: { enableIamAuthorizationMode: true },
      },
    });

    const template = Template.fromStack(stack);

    // We do not expect any policy statements relating to the GraphQL API, since no policy was created by the customer. We'll do a string
    // match across all roles & policies as a brute-force way of ensuring that nothing is granting access to the custom operations. We
    // search policies directly, and also roles to make sure we get inline policies attached to the roles.
    const allRoles = template.findResources('AWS::IAM::Role');
    const allRolesString = JSON.stringify(allRoles);
    expect(allRolesString).not.toContain('appsync:GraphQL');

    const allPolicies = template.findResources('AWS::IAM::Policy');
    const allPoliciesString = JSON.stringify(allPolicies);
    expect(allPoliciesString).not.toContain('appsync:GraphQL');

    // There should be no managed policies at all since we didn't include an Identity Pool
    const allManagedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
    expect(allManagedPolicies).toStrictEqual({});
  });

  it('Respects customer-provided access policies', () => {
    const stack = new cdk.Stack();

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          getFooCustom: String
        }
        type Mutation {
          updateFooCustom: String
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `),
      authorizationModes: {
        iamConfig: { enableIamAuthorizationMode: true },
      },
    });

    new Role(stack, 'TestRole', {
      assumedBy: new AccountPrincipal('123456789012'),
      roleName: 'TestCustomOperationAccessRole',
      inlinePolicies: {
        TestCustomOperationAccessPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['appsync:GraphQL'],
              resources: [`${api.resources.graphqlApi.arn}/types/Mutation/fields/updateFooCustom`],
              effect: Effect.ALLOW,
            }),
          ],
        }),
      },
    });

    const template = Template.fromStack(stack);

    // Rather than a string match across all roles, we'll ensure that access to the custom mutation comes only in the customer-provided role
    const allRoles = template.findResources('AWS::IAM::Role');

    const customerRoleKeys = Object.keys(allRoles).filter((key) => key.startsWith('TestRole'));
    expect(customerRoleKeys.length).toEqual(1);

    const customerRole = allRoles[customerRoleKeys[0]];
    const customerRoleString = JSON.stringify(customerRole);

    const allRolesExceptCustomer = JSON.parse(JSON.stringify(allRoles));
    delete allRolesExceptCustomer[customerRoleKeys[0]];

    const allRolesExceptCustomerString = JSON.stringify(allRoles);

    // No role or policy should contain a permission for getFooCustom, since it wasn't explicitly granted
    expect(allRolesExceptCustomerString).not.toContain('getFooCustom');
    expect(customerRoleString).not.toContain('getFooCustom');

    // The customer role should contain a permission for updateFooCustom as specified in the inline policy above
    expect(customerRoleString).toContain('appsync:GraphQL');
    expect(customerRoleString).toContain('/types/Mutation/fields/updateFooCustom');

    // No standalone policy resource should contain a permission to the API
    const allPolicies = template.findResources('AWS::IAM::Policy');
    const allPoliciesString = JSON.stringify(allPolicies);
    expect(allPoliciesString).not.toContain('appsync:GraphQL');

    // There should be no managed policies at all since we didn't include an Identity Pool
    const allManagedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
    expect(allManagedPolicies).toStrictEqual({});
  });

  it('Correctly scopes when an identity pool is present', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
    const userPoolClient = userPool.addClient('TestClient');

    const identityPool = new cognito.CfnIdentityPool(stack, 'TestIdentityPool', {
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: 'Amazon Cognito',
        },
      ],
    });
    const appsync = new ServicePrincipal('appsync.amazonaws.com');
    const authenticatedUserRole = new Role(stack, 'AuthRole', { assumedBy: appsync });
    const unauthenticatedUserRole = new Role(stack, 'UnauthRole', { assumedBy: appsync });

    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ provider: identityPool, allow: private }]) {
          description: String!
        }
        type Query {
          getFooCustom: String
        }
        type Mutation {
          updateFooCustom: String
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `),
      authorizationModes: {
        defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: { userPool },
        iamConfig: { enableIamAuthorizationMode: true },
        identityPoolConfig: {
          identityPoolId: identityPool.attrId,
          authenticatedUserRole,
          unauthenticatedUserRole,
        },
      },
    });

    const template = Template.fromStack(stack);

    const allRoles = template.findResources('AWS::IAM::Role');
    const allRolesString = JSON.stringify(allRoles);
    expect(allRolesString).not.toContain('appsync:GraphQL');

    const allPolicies = template.findResources('AWS::IAM::Policy');
    const allPoliciesString = JSON.stringify(allPolicies);
    expect(allPoliciesString).not.toContain('appsync:GraphQL');

    // The managed policy for the identity pool should allow access to only the models, but not to the custom operations
    const allManagedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
    const allManagedPoliciesString = JSON.stringify(allManagedPolicies);
    expect(allManagedPoliciesString).toContain('appsync:GraphQL');
    expect(allManagedPoliciesString).toContain('getTodo');
    expect(allManagedPoliciesString).toContain('listTodos');
    expect(allManagedPoliciesString).toContain('createTodo');
    expect(allManagedPoliciesString).toContain('updateTodo');
    expect(allManagedPoliciesString).toContain('deleteTodo');
    expect(allManagedPoliciesString).toContain('onCreateTodo');
    expect(allManagedPoliciesString).toContain('onUpdateTodo');
    expect(allManagedPoliciesString).toContain('onDeleteTodo');
    expect(allManagedPoliciesString).not.toContain('getFooCustom');
    expect(allManagedPoliciesString).not.toContain('updateFooCustom');
    expect(allManagedPoliciesString).not.toContain('onUpdateFooCustom');
  });
});
