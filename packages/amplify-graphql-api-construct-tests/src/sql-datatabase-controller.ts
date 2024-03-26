import path from 'path';
import * as fs from 'fs-extra';
import { SqlModelDataSourceDbConnectionConfig } from '@aws-amplify/graphql-api-construct';
import {
  deleteDbConnectionConfig,
  deleteDbConnectionConfigWithSecretsManager,
  deleteDBInstance,
  extractVpcConfigFromDbInstance,
  RDSConfig,
  setupRDSInstanceAndData,
  storeDbConnectionConfig,
  storeDbConnectionConfigWithSecretsManager,
} from 'amplify-category-api-e2e-core';
import { isSqlModelDataSourceSecretsManagerDbConnectionConfig } from '@aws-amplify/graphql-transformer-interfaces';

export interface SqlDatabaseDetails {
  dbConfig: {
    endpoint: string;
    port: number;
    dbName: string;
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

    const dbConnectionConfigSSM = await storeDbConnectionConfig({
      region: this.options.region,
      pathPrefix: `/${this.options.identifier}/test`,
      hostname: dbConfig.endpoint,
      port: dbConfig.port,
      databaseName: this.options.dbname,
      username: this.options.username,
      password: dbConfig.password,
    });
    if (!dbConnectionConfigSSM) {
      throw new Error('Failed to store db connection config for SSM');
    }
    console.log(`Stored db connection config in SSM: ${JSON.stringify(dbConnectionConfigSSM)}`);

    this.databaseDetails = {
      dbConfig: {
        endpoint: dbConfig.endpoint,
        port: dbConfig.port,
        dbName: this.options.dbname,
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
        } else {
          return deleteDbConnectionConfig({
            region: this.options.region,
            hostnameSsmPath: dbConnectionConfig.hostnameSsmPath,
            portSsmPath: dbConnectionConfig.portSsmPath,
            usernameSsmPath: dbConnectionConfig.usernameSsmPath,
            passwordSsmPath: dbConnectionConfig.passwordSsmPath,
            databaseNameSsmPath: dbConnectionConfig.databaseNameSsmPath,
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
    console.log(`Wrote ${filePath}`);
  };
}
