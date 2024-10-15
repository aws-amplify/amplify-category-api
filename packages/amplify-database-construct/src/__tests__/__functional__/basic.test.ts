import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc, IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { AmplifyDatabase } from '../../amplify-database';

describe('basic functionality', () => {
  it('creates a db cluster', () => {
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

  it('creates admin, dataapi, and console secrets', () => {
    const stack = new Stack();

    const vpc = new Vpc(stack, 'TestVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
    });

    new AmplifyDatabase(stack, 'TestDatabase', {
      vpc,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SecretsManager::Secret', 3);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"admin"}',
      },
    });
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"dataapi"}',
      },
    });
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"console"}',
      },
    });
  });
});
