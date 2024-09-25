import path from 'path';
import * as fs from 'fs-extra';
import { SqlModelDataSourceDbConnectionConfig, ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-api-construct';
import {
  ClusterInfo,
  clearTestDataUsingDataApi,
  clearTestDataUsingDirectConnection,
  deleteSSMParameters,
  deleteDbConnectionConfigWithSecretsManager,
  deleteDBCluster,
  deleteDBInstance,
  extractVpcConfigFromDbInstance,
  RDSConfig,
  SqlEngine,
  setupRDSInstanceAndData,
  setupRDSClusterAndData,
  storeDbConnectionConfig,
  storeDbConnectionStringConfig,
  storeDbConnectionConfigWithSecretsManager,
  isDataAPISupported,
  isCI,
  generateDBName,
  setupDataInExistingCluster,
} from 'amplify-category-api-e2e-core';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import {
  isSqlModelDataSourceSecretsManagerDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionStringConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import { getClusterIdFromLocalConfig } from './utils/sql-local-testing';
import { getPreProvisionedClusterInfo } from './utils/sql-pre-provisioned-cluster';

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
  private clusterInfo: ClusterInfo | undefined;
  private useDataAPI: boolean;
  private enableLocalTesting: boolean;
  private usePreProvisionedCluster: boolean;

  constructor(private readonly setupQueries: Array<string>, private options: RDSConfig) {
    // Data API is not supported in opted-in regions
    if (options.engine === 'postgres' && isDataAPISupported(options.region)) {
      this.useDataAPI = true;
      this.enableLocalTesting = !isCI() && getClusterIdFromLocalConfig(options.region, options.engine) !== undefined;
    } else {
      this.useDataAPI = false;
    }

    // If database name not manually set, provide and sanitize the config dbname
    if (!options.dbname || options.dbname.length == 0 || this.enableLocalTesting) {
      this.options.dbname = generateDBName().replace(/[^a-zA-Z0-9_]/g, '');
    }
  }

  setupDatabase = async (): Promise<SqlDatabaseDetails> => {
    let dbConfig;

    if (this.useDataAPI) {
      const preProvisionedClusterInfo = await getPreProvisionedClusterInfo(this.options.region, this.options.engine);
      this.usePreProvisionedCluster = preProvisionedClusterInfo !== undefined;
      if (this.enableLocalTesting || this.usePreProvisionedCluster) {
        const identifier = this.usePreProvisionedCluster
          ? preProvisionedClusterInfo.clusterIdentifier
          : getClusterIdFromLocalConfig(this.options.region, this.options.engine);
        dbConfig = await setupDataInExistingCluster(identifier, this.options, this.setupQueries, preProvisionedClusterInfo?.secretArn);
        this.clusterInfo = dbConfig;
        this.options.username = dbConfig.username;
        this.options.dbname = dbConfig.dbName;
      } else {
        dbConfig = await setupRDSClusterAndData(this.options, this.setupQueries);
        this.clusterInfo = dbConfig;
      }
    } else {
      dbConfig = await setupRDSInstanceAndData(this.options, this.setupQueries);
      this.options.password = dbConfig.password;
    }

    if (!dbConfig) {
      throw new Error('Failed to setup RDS instance');
    }

    const dbConnectionConfigSecretsManager = {
      databaseName: this.options.dbname,
      hostname: dbConfig.endpoint,
      port: dbConfig.port,
      secretArn: dbConfig.secretArn,
    };
    console.log(`Stored db connection config in Secrets manager: ${JSON.stringify(dbConnectionConfigSecretsManager)}`);

    if (this.useDataAPI || !this.options.password || this.enableLocalTesting) {
      const secretArn = dbConfig.secretArn;
      const secretsManagerClient = new SecretsManagerClient({ region: this.options.region });
      const secretManagerCommand = new GetSecretValueCommand({
        SecretId: secretArn,
      });
      const secretsManagerResponse = await secretsManagerClient.send(secretManagerCommand);
      const { password: managedPassword } = JSON.parse(secretsManagerResponse.SecretString);
      if (!managedPassword) {
        throw new Error('Unable to get RDS cluster master user password');
      }
      this.options.password = managedPassword;
    }
    const { secretArn: secretArnWithCustomKey, keyArn: keyArn } = await storeDbConnectionConfigWithSecretsManager({
      region: this.options.region,
      username: this.options.username,
      password: this.options.password,
      secretName: `${this.options.identifier}-${this.options.dbname}-secret-custom-key`,
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

    const pathPrefix = `/${this.options.identifier}/${this.options.dbname}/test`;
    const engine = this.options.engine;
    const dbConnectionConfigSSM = await storeDbConnectionConfig({
      region: this.options.region,
      pathPrefix,
      hostname: dbConfig.endpoint,
      port: dbConfig.port,
      databaseName: this.options.dbname,
      username: this.options.username,
      password: this.options.password,
    });
    const dbConnectionStringConfigSSM = await storeDbConnectionStringConfig({
      region: this.options.region,
      pathPrefix,
      connectionUri: this.getConnectionUri(
        engine,
        this.options.username,
        this.options.password,
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
        this.getConnectionUri(engine, this.options.username, this.options.password, dbConfig.endpoint, dbConfig.port, this.options.dbname),
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
          secretArn: dbConfig.secretArn,
        },
        connectionUri: dbConnectionStringConfigSSM,
        connectionUriMultiple: dbConnectionStringConfigMultiple,
      },
    };
    return this.databaseDetails;
  };

  clearDatabase = async (): Promise<void> => {
    if (this.useDataAPI) {
      await clearTestDataUsingDataApi(this.clusterInfo, this.options.region);
      return;
    }

    await clearTestDataUsingDirectConnection(this.options, this.databaseDetails.dbConfig.endpoint, this.databaseDetails.dbConfig.port);
  };

  cleanupDatabase = async (): Promise<void> => {
    if (this.usePreProvisionedCluster || !this.databaseDetails) {
      return;
    }

    if (!this.enableLocalTesting) {
      if (this.useDataAPI) {
        await deleteDBCluster(this.options.identifier, this.options.region);
      } else {
        await deleteDBInstance(this.options.identifier, this.options.region);
      }
    }

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
  writeDbDetails = (projRoot: string, connectionConfigName: string, schemaConfigString?: string): void => {
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
      schemaConfig: schemaConfigString,
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
    return `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostname}:${port}/${dbName}`;
  };
}
