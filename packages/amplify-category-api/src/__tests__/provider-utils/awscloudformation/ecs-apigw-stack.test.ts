import { App } from 'aws-cdk-lib';
import Container from '../../../provider-utils/awscloudformation/docker-compose/ecs-objects/container';
import { EcsStack } from '../../../provider-utils/awscloudformation/ecs-apigw-stack';
import { API_TYPE } from '../../../provider-utils/awscloudformation/service-walkthroughs/containers-walkthrough';

describe('ecs stack', () => {
  it('should generate valid CFN template', () => {
    const app = new App();
    const ecsStack = new EcsStack(app, 'testEcsStack', {
      apiName: 'testApi',
      apiType: API_TYPE.REST,
      categoryName: 'testCategory',
      containers: [
        new Container(
          undefined,
          'testContainer',
          [],
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            command: 'foo',
          },
        ),
      ],
      currentStackName: 'testStack',
      dependsOn: [
        {
          category: '',
          resourceName: 'NetworkStack',
          attributes: [
            'ClusterName',
            'VpcId',
            'VpcCidrBlock',
            'SubnetIds',
            'VpcLinkId',
            'CloudMapNamespaceId',
          ],
        },
      ],
      deploymentMechanism: undefined,
      desiredCount: 1,
      existingEcrRepositories: undefined,
      exposedContainer: {
        name: 'testExposedContainer',
        port: 12345,
      },
      isInitialDeploy: false,
      restrictAccess: false,
      taskPorts: [],
      policies: [],
    });

    const cfn = ecsStack.toCloudFormation();
    expect(cfn).toBeDefined();
    expect(cfn).toMatchSnapshot();
  });
});
