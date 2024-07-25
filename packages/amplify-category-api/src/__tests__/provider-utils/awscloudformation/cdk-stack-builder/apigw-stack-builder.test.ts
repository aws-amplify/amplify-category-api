import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyApigwResourceStack } from '../../../../provider-utils/awscloudformation/cdk-stack-builder/apigw-stack-builder';
import { CrudOperation, PermissionSetting } from '../../../../provider-utils/awscloudformation/cdk-stack-builder/types';
import { convertCrudOperationsToCfnPermissions } from '../../../../provider-utils/awscloudformation/cdk-stack-builder/apigw-stack-transform';

describe('AmplifyApigwResourceStack', () => {
  test('generateStackResources should synthesize the way we expected', () => {
    const app = new cdk.App();
    const amplifyApigwStack = new AmplifyApigwResourceStack(app, 'amplifyapigwstack', {
      version: 1,
      paths: {
        '/path': {
          lambdaFunction: 'lambdaFunction',
          permissions: {
            setting: PermissionSetting.OPEN,
          },
        },
      },
    });
    amplifyApigwStack.generateStackResources('myapi');
    const template = Template.fromStack(amplifyApigwStack);
    template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
      ResponseType: 'DEFAULT_4XX',
      ResponseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'gatewayresponse.header.Access-Control-Allow-Methods': "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'",
        'gatewayresponse.header.Access-Control-Expose-Headers': "'Date,X-Amzn-ErrorType'",
      },
      RestApiId: {
        Ref: 'myapi',
      },
    });
    template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
      ResponseType: 'DEFAULT_5XX',
      ResponseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'gatewayresponse.header.Access-Control-Allow-Methods': "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'",
        'gatewayresponse.header.Access-Control-Expose-Headers': "'Date,X-Amzn-ErrorType'",
      },
      RestApiId: {
        Ref: 'myapi',
      },
    });
  });
  test('addIamPolicyResourceForUserPoolGroup should generate correct IAM policies when {} is used in path', () => {
    const app = new cdk.App();
    const mockResourceName = 'mockRestAPIName';
    const mockAuthRoleLogicalId = 'mockAuthRoleLogicalId';
    const cliInputs = {
      version: 1,
      paths: {
        '/book/{isbn}': {
          lambdaFunction: 'lambdaFunction1',
          permissions: {
            setting: PermissionSetting.PRIVATE,
            groups: {
              admin: [CrudOperation.CREATE, CrudOperation.UPDATE, CrudOperation.READ, CrudOperation.DELETE],
              member: [CrudOperation.READ],
            },
          },
        },
        '/items/{id}/foobar': {
          lambdaFunction: 'lambdaFunction2',
          permissions: {
            setting: PermissionSetting.PRIVATE,
            groups: {
              admin: [CrudOperation.CREATE, CrudOperation.UPDATE, CrudOperation.READ, CrudOperation.DELETE],
              member: [CrudOperation.READ],
            },
          },
        },
      },
    };
    const amplifyApigwStack = new AmplifyApigwResourceStack(app, 'amplifyapigwstack', cliInputs);
    const pathsWithUserPoolGroups = Object.entries(cliInputs.paths).filter(([_, path]) => !!path?.permissions?.groups);
    for (const [pathName, path] of pathsWithUserPoolGroups) {
      for (const [groupName, crudOps] of Object.entries(path.permissions.groups)) {
        amplifyApigwStack.addIamPolicyResourceForUserPoolGroup(
          mockResourceName,
          mockAuthRoleLogicalId,
          groupName,
          pathName,
          convertCrudOperationsToCfnPermissions(crudOps),
        );
      }
    }

    const template = Template.fromStack(amplifyApigwStack);
    expect(template.findResources('AWS::IAM::Policy')).toMatchSnapshot();
  });
});
