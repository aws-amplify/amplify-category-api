import { MakeSqlDataSourceStrategyOptions, mockSqlDataSourceStrategy } from '../datasource-utils/utils';

describe('mockSqlDataSourceStrategy', () => {
  it('generates a strategy with defaults', () => {
    expect(mockSqlDataSourceStrategy()).toMatchObject({
      customSqlStatements: undefined,
      dbConnectionConfig: {
        databaseNameSsmPath: '/dbconfig/databaseName',
        hostnameSsmPath: '/dbconfig/hostname',
        passwordSsmPath: '/dbconfig/password',
        portSsmPath: '/dbconfig/port',
        usernameSsmPath: '/dbconfig/username',
      },
      dbType: 'MYSQL',
      name: 'MYSQLMockStrategy',
      sqlLambdaProvisionedConcurrencyConfig: undefined,
      vpcConfiguration: undefined,
    });
  });

  it('allows callers to override defaults', () => {
    const options: MakeSqlDataSourceStrategyOptions = {
      name: 'mock strategy',
      dbType: 'POSTGRES',
      dbConnectionConfig: {
        databaseNameSsmPath: 'overridden/dbconfig/databaseName',
        hostnameSsmPath: 'overridden/dbconfig/hostname',
        passwordSsmPath: 'overridden/dbconfig/password',
        portSsmPath: 'overridden/dbconfig/port',
        usernameSsmPath: 'overridden/dbconfig/username',
      },
      vpcConfiguration: {
        vpcId: 'vpc123',
        securityGroupIds: ['sg-1'],
        subnetAvailabilityZoneConfig: [{ subnetId: 'sb-1', availabilityZone: 'us-west-2a' }],
      },
      sqlLambdaProvisionedConcurrencyConfig: {
        provisionedConcurrentExecutions: 2,
      },
      customSqlStatements: { foo: 'SELECT * FROM foo' },
    };
    expect(mockSqlDataSourceStrategy(options)).toMatchObject({
      name: 'mock strategy',
      dbType: 'POSTGRES',
      dbConnectionConfig: {
        databaseNameSsmPath: 'overridden/dbconfig/databaseName',
        hostnameSsmPath: 'overridden/dbconfig/hostname',
        passwordSsmPath: 'overridden/dbconfig/password',
        portSsmPath: 'overridden/dbconfig/port',
        usernameSsmPath: 'overridden/dbconfig/username',
      },
      vpcConfiguration: {
        vpcId: 'vpc123',
        securityGroupIds: ['sg-1'],
        subnetAvailabilityZoneConfig: [{ subnetId: 'sb-1', availabilityZone: 'us-west-2a' }],
      },
      sqlLambdaProvisionedConcurrencyConfig: {
        provisionedConcurrentExecutions: 2,
      },
      customSqlStatements: { foo: 'SELECT * FROM foo' },
    });
  });
});
