import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc, IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { AmplifyDatabase } from '../../amplify-database';

describe('basic functionality', () => {
  it('renders a db cluster', () => {
    const stack = new Stack();

    const vpc = new Vpc(stack, 'TestVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
    });

    new AmplifyDatabase(stack, 'TestDatabase', {
      vpc,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::RDS::DBCluster', 1);
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-mysql',
    });
  });
});
