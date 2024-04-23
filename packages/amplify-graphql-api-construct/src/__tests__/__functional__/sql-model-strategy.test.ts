import * as fs from 'fs';
import * as path from 'path';

import { SQLLambdaModelDataSourceStrategyFactory, isSqlModelDataSourceDbConnectionConfig } from '../../sql-model-datasource-strategy';
import { SQLLambdaModelDataSourceStrategy } from '../../model-datasource-strategy-types';

describe('SQL bound API definitions', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync('sql-bound-definition-tests');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
  });

  it('constructs a definition using fromCustomSqlFiles', () => {
    const customSql = {
      hello: 'INSERT INTO hello (world) VALUES ("world");',
      'hello.2': 'INSERT INTO hello.2 (world) VALUES ("world");',
    };

    const sqlFiles = Object.entries(customSql).map(([key, value]) => {
      const fileName = `${key}.sql`;
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, value);
      return filePath;
    });

    const otherOptions: Exclude<SQLLambdaModelDataSourceStrategy, 'customSqlStatements'> = {
      name: 'mystrategy',
      dbType: 'MYSQL',
      vpcConfiguration: {
        vpcId: 'vpc-1234abcd',
        securityGroupIds: ['sg-123'],
        subnetAvailabilityZoneConfig: [{ subnetId: 'subnet-123', availabilityZone: 'us-east-1a' }],
      },
      dbConnectionConfig: {
        hostnameSsmPath: '/ssm/path/hostnameSsmPath',
        portSsmPath: '/ssm/path/portSsmPath',
        usernameSsmPath: '/ssm/path/usernameSsmPath',
        passwordSsmPath: '/ssm/path/passwordSsmPath',
        databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
      },
    };

    const strategy = SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles(sqlFiles, otherOptions);

    expect(strategy.customSqlStatements?.['hello']).toEqual(customSql['hello']);
    expect(strategy.customSqlStatements?.['hello.2']).toEqual(customSql['hello.2']);
    expect(strategy.dbType).toEqual(otherOptions.dbType);
    expect(strategy.vpcConfiguration).toEqual(otherOptions.vpcConfiguration);
    expect(strategy.dbConnectionConfig).toEqual(otherOptions.dbConnectionConfig);
  });

  describe('checks for SQL Datasource DB connection config', () => {
    it('accepts a connection uri string in DB configuration', () => {
      const dbConfig = {
        connectionUriSsmPath: '/ssm/path/connectionUri',
      };
      expect(isSqlModelDataSourceDbConnectionConfig(dbConfig)).toBe(true);
    });

    it('accepts multiple connection uri SSM paths in DB configuration', () => {
      const dbConfig = {
        connectionUriSsmPath: ['/ssm/path/connectionUri/1', '/ssm/path/connectionUri/2'],
      };
      expect(isSqlModelDataSourceDbConnectionConfig(dbConfig)).toBe(true);
    });

    it('does not accept a connection uri object in DB configuration', () => {
      const dbConfig = {
        connectionUriSsmPath: {},
      };
      expect(isSqlModelDataSourceDbConnectionConfig(dbConfig)).toBe(false);
    });

    it('does not accept undefined connection uri in DB configuration', () => {
      const dbConfig = {
        connectionUriSsmPath: undefined,
      };
      expect(isSqlModelDataSourceDbConnectionConfig(dbConfig)).toBe(false);
    });
  });
});
