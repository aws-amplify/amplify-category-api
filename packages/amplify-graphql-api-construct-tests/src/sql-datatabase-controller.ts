import path from 'path';
import * as fs from 'fs-extra';
import { SqlModelDataSourceDbConnectionConfig, ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-api-construct';
import {
  deleteSSMParameters,
  deleteDbConnectionConfigWithSecretsManager,
  deleteDBInstance,
  extractVpcConfigFromDbInstance,
  RDSConfig,
  SqlEngine,
  setupRDSInstanceAndData,
  storeDbConnectionConfig,
  storeDbConnectionStringConfig,
  storeDbConnectionConfigWithSecretsManager,
} from 'amplify-category-api-e2e-core';
import {
  isSqlModelDataSourceSecretsManagerDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionStringConfig,
} from '@aws-amplify/graphql-transformer-interfaces';

export interface SqlDatabaseDetails {
  dbConfig: {
    endpoint: string;
    port: number;
    dbName: string;
    strategyName: string;
    dbType: ModelDataSourceStrategySqlDbType;
    vpcConfig: {
      vpcId: string;
      securityGroupIds: string[];
      subnetAvailabilityZones: {
        subnetId: string;
        availabilityZone: string;
      }[];
    };
  };
  connectionConfigs: {
    [key: string]: SqlModelDataSourceDbConnectionConfig;
  };
}

/**
 * This class is used to provision and destroy a sql database for testing purposes.
 */
export class SqlDatatabaseController {
  private databaseDetails: SqlDatabaseDetails | undefined;

  constructor(private readonly setupQueries: Array<string>, private readonly options: RDSConfig) {}

  setupDatabase = async (): Promise<SqlDatabaseDetails> => {
    console.log(`Setting up database '${this.options.identifier}'`);

    const dbConfig = await setupRDSInstanceAndData(this.options, this.setupQueries);
    if (!dbConfig) {
      throw new Error('Failed to setup RDS instance');
    }

    const { secretArn } = await storeDbConnectionConfigWithSecretsManager({
      region: this.options.region,
      username: this.options.username,
      password: dbConfig.password,
      secretName: `${this.options.identifier}-secret`,
    });
    if (!secretArn) {
      throw new Error('Failed to store db connection config for secrets manager');
    }
    const dbConnectionConfigSecretsManager = {
      databaseName: this.options.dbname,
      hostname: dbConfig.endpoint,
      port: dbConfig.port,
      secretArn,
    };
    console.log(`Stored db connection config in Secrets manager: ${JSON.stringify(dbConnectionConfigSecretsManager)}`);

    const { secretArn: secretArnWithCustomKey, keyArn } = await storeDbConnectionConfigWithSecretsManager({
      region: this.options.region,
      username: this.options.username,
      password: dbConfig.password,
      secretName: `${this.options.identifier}-secret-custom-key`,
      useCustomEncryptionKey: true,
    });
    if (!secretArnWithCustomKey) {
      throw new Error('Failed to store db connection config for secrets manager');
    }
    const dbConnectionConfigSecretsManagerCustomKey = {
      databaseName: this.options.dbname,
      hostname: dbConfig.endpoint,
      port: dbConfig.port,
      secretArn: secretArnWithCustomKey,
      keyArn,
    };
    console.log(`Stored db connection config in Secrets manager: ${JSON.stringify(dbConnectionConfigSecretsManagerCustomKey)}`);

    const pathPrefix = `/${this.options.identifier}/test`;
    const engine = this.options.engine;
    const dbConnectionConfigSSM = await storeDbConnectionConfig({
      region: this.options.region,
      pathPrefix,
      hostname: dbConfig.endpoint,
      port: dbConfig.port,
      databaseName: this.options.dbname,
      username: this.options.username,
      password: dbConfig.password,
    });
    const dbConnectionStringConfigSSM = await storeDbConnectionStringConfig({
      region: this.options.region,
      pathPrefix,
      connectionUri: this.getConnectionUri(
        engine,
        this.options.username,
        dbConfig.password,
        dbConfig.endpoint,
        dbConfig.port,
        this.options.dbname,
      ),
    });
    const dbConnectionStringConfigMultiple = await storeDbConnectionStringConfig({
      region: this.options.region,
      pathPrefix,
      connectionUri: [
        'mysql://username:password@host:3306/dbname',
        this.getConnectionUri(engine, this.options.username, dbConfig.password, dbConfig.endpoint, dbConfig.port, this.options.dbname),
      ],
    });
    const parameters = {
      ...dbConnectionConfigSSM,
      ...dbConnectionStringConfigSSM,
      ...dbConnectionStringConfigMultiple,
    };
    if (!dbConnectionConfigSSM) {
      throw new Error('Failed to store db connection config for SSM');
    }
    console.log(`Stored db connection config in SSM: ${JSON.stringify(Object.keys(parameters))}`);

    this.databaseDetails = {
      dbConfig: {
        endpoint: dbConfig.endpoint,
        port: dbConfig.port,
        dbName: this.options.dbname,
        strategyName: `${engine}DBStrategy`,
        dbType: engine === 'postgres' ? 'POSTGRES' : 'MYSQL',
        vpcConfig: extractVpcConfigFromDbInstance(dbConfig.dbInstance),
      },
      connectionConfigs: {
        ssm: dbConnectionConfigSSM,
        secretsManager: dbConnectionConfigSecretsManager,
        secretsManagerCustomKey: dbConnectionConfigSecretsManagerCustomKey,
        secretsManagerManagedSecret: {
          databaseName: this.options.dbname,
          hostname: dbConfig.endpoint,
          port: dbConfig.port,
          secretArn: dbConfig.managedSecretArn,
        },
        connectionUri: dbConnectionStringConfigSSM,
        connectionUriMultiple: dbConnectionStringConfigMultiple,
      },
    };

    return this.databaseDetails;
  };

  cleanupDatabase = async (): Promise<void> => {
    if (!this.databaseDetails) {
      // Database has not been set up.
      return;
    }

    await deleteDBInstance(this.options.identifier, this.options.region);

    const { connectionConfigs } = this.databaseDetails;

    await Promise.all(
      Object.values(connectionConfigs).map((dbConnectionConfig) => {
        if (isSqlModelDataSourceSecretsManagerDbConnectionConfig(dbConnectionConfig)) {
          return deleteDbConnectionConfigWithSecretsManager({
            region: this.options.region,
            secretArn: dbConnectionConfig.secretArn,
          });
        } else if (isSqlModelDataSourceSsmDbConnectionConfig(dbConnectionConfig)) {
          return deleteSSMParameters({
            region: this.options.region,
            parameterNames: [
              dbConnectionConfig.hostnameSsmPath,
              dbConnectionConfig.portSsmPath,
              dbConnectionConfig.usernameSsmPath,
              dbConnectionConfig.passwordSsmPath,
              dbConnectionConfig.databaseNameSsmPath,
            ],
          });
        } else if (isSqlModelDataSourceSsmDbConnectionStringConfig(dbConnectionConfig)) {
          const { connectionUriSsmPath } = dbConnectionConfig;
          const paths = Array.isArray(connectionUriSsmPath) ? connectionUriSsmPath : [connectionUriSsmPath];
          return deleteSSMParameters({
            region: this.options.region,
            parameterNames: paths,
          });
        }
      }),
    );
  };

  /**
   * Writes the specified DB details to a file named `db-details.json` in the specified directory.
   * Used to pass db configs from setup code to the CDK app under test.
   *
   * **NOTE** Do not call this until the CDK project is initialized: `cdk init` fails if the working directory is not empty.
   *
   * @param projRoot the destination directory to write the `db-details.json` file to
   */
  writeDbDetails = (projRoot: string, connectionConfigName: string): void => {
    if (!this.databaseDetails) {
      throw new Error('Database has not been set up. Make sure to call setupDatabase first');
    }
    const dbConnectionConfig = this.databaseDetails.connectionConfigs[connectionConfigName];
    if (!dbConnectionConfig) {
      throw new Error(
        `Invalid connection config ${connectionConfigName}. Available options are ${JSON.stringify(
          Object.keys(this.databaseDetails.connectionConfigs),
        )}`,
      );
    }
    const detailsStr = JSON.stringify({
      dbConfig: this.databaseDetails.dbConfig,
      dbConnectionConfig,
    });
    const filePath = path.join(projRoot, 'db-details.json');
    fs.writeFileSync(filePath, detailsStr);
    console.log(`Wrote DB details at ${filePath}`);
  };

  /**
   * Constructs the database connection URI based on the given database connection components
   */
  getConnectionUri = (engine: SqlEngine, username: string, password: string, hostname: string, port: number, dbName: string): string => {
    const protocol = engine === 'postgres' ? 'postgresql' : 'mysql';
    return `${protocol}://${username}:${password}@${hostname}:${port}/${dbName}`;
  };
}
