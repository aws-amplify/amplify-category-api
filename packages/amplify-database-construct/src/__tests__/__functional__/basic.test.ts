import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc, IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { AmplifyDatabase } from '../../amplify-database';

describe('basic functionality', () => {
  it('creates a db cluster with postgres', () => {
    const stack = new Stack();

    const vpc = new Vpc(stack, 'TestVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
    });

    new AmplifyDatabase(stack, 'TestDatabase', {
      vpc,
      dbType: 'POSTGRES',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::RDS::DBCluster', 1);
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
    });
  });

  it('fails if dbType is not POSTGRES', () => {
    const stack = new Stack();

    const vpc = new Vpc(stack, 'TestVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
    });

    expect(() => {
      new AmplifyDatabase(stack, 'TestDatabase', {
        vpc,
        // @ts-expect-error using invalid dbType
        dbType: 'NOTADBTYPE',
      });
    }).toThrow('Unsupported database type: NOTADBTYPE');
  });

  it('creates admin, dataapi, and console secrets', () => {
    const stack = new Stack();

    const vpc = new Vpc(stack, 'TestVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
    });

    new AmplifyDatabase(stack, 'TestDatabase', {
      vpc,
      dbType: 'POSTGRES',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SecretsManager::Secret', 3);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"postgres"}',
      },
    });
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"console","dbname":"amplify"}',
      },
    });
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"dataapi","dbname":"amplify"}',
      },
    });
  });

  it('creates a data source strategy', () => {
    const stack = new Stack();

    const vpc = new Vpc(stack, 'TestVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
    });

    const amplifyDatabase = new AmplifyDatabase(stack, 'TestDatabase', {
      vpc,
      dbType: 'POSTGRES',
    });

    expect(amplifyDatabase.dataSourceStrategy).toBeDefined();
    expect(amplifyDatabase.dataSourceStrategy.name).toEqual('AmplifyDatabaseDataSourceStrategy');
    expect(amplifyDatabase.dataSourceStrategy.dbType).toEqual('POSTGRES');
  });
});
