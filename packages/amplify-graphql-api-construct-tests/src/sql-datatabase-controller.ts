import path from 'path';
import * as fs from 'fs-extra';
import generator from 'generate-password';
import { SqlModelDataSourceDbConnectionConfig, ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-api-construct';
import {
  deleteSSMParameters,
  deleteDbConnectionConfigWithSecretsManager,
  deleteDBInstance,
  extractVpcConfigFromDbInstance,
  RDSConfig,
  SqlEngine,
  setupRDSInstanceAndData,
  setupRDSClusterAndData,
  storeDbConnectionConfig,
  storeDbConnectionStringConfig,
  storeDbConnectionConfigWithSecretsManager,
  deleteDBCluster,
  isOptInRegion,
  isDataAPISupported,
  isCI,
  generateDBName,
  isDataAPISupportedRegion,
} from 'amplify-category-api-e2e-core';
import { SecretsManagerClient, CreateSecretCommand, DeleteSecretCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import {
  isSqlModelDataSourceSecretsManagerDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionStringConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  GetParameterCommand,
  GetParameterResult,
  GetParametersByPathCommand,
  GetParametersByPathResult,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';

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
  private useDataAPI: boolean;
  private enableLocalTesting: boolean;

  constructor(private readonly setupQueries: Array<string>, private options: RDSConfig) {
    // Data API is not supported in opted-in regions
    if (options.engine === 'postgres' && isDataAPISupported(options.region)) {
      this.useDataAPI = true;
    } else {
      this.useDataAPI = false;
    }
    this.enableLocalTesting = /*isCI()*/ true;

    // If database name not manually set, provide and sanitize the config dbname
    if (!options.dbname || options.dbname.length == 0 || this.enableLocalTesting) {
      this.options.dbname = generateDBName().replace(/[^a-zA-Z0-9_]/g, '');
    }
  }

  setNewConfig = async (): Promise<RDSConfig> => {
    // Access the specific config from the local cluster configs JSON file
    const repoRoot = path.join(__dirname, '..', '..', '..');
    const localClusterPath = path.join(repoRoot, 'scripts', 'e2e-test-local-cluster-config.json');
    const localClustersObject = JSON.parse(fs.readFileSync(localClusterPath, 'utf-8'));
    const cluster = localClustersObject[this.options.region][0];

    // Get the config identifier and connection URI
    const identifier = cluster.dbConfig.identifier;
    const connectionUri = `/${identifier}/test`;

    const ssmClient = new SSMClient({ region: this.options.region });
    const getParameterCommand = new GetParametersByPathCommand({ Path: connectionUri, WithDecryption: true });
    const getParameterResponse: GetParametersByPathResult = await ssmClient.send(getParameterCommand);

    const setParameterCommand = new PutParameterCommand({
      Name: `${connectionUri}/databaseName`,
      Value: this.options.dbname,
      Overwrite: true,
    });
    const putParameterResponse = await ssmClient.send(setParameterCommand);

    //const dbname = getParameterResponse.Parameters.find(obj => obj.Name === `${connectionUri}/databaseName`).Value;
    const username = getParameterResponse.Parameters.find((obj) => obj.Name === `${connectionUri}/username`).Value;
    const password = getParameterResponse.Parameters.find((obj) => obj.Name === `${connectionUri}/password`).Value;

    const setParameterCommand2 = new PutParameterCommand({ Name: `${connectionUri}/password`, Value: password, Overwrite: true });
    const putParameterResponse2 = await ssmClient.send(setParameterCommand);

    const config: RDSConfig = {
      identifier,
      engine: this.options.engine,
      dbname: this.options.dbname,
      username,
      password,
      region: this.options.region,
    };

    return config;
  };

  setupDatabase = async (): Promise<SqlDatabaseDetails> => {
    let dbConfig;

    if (this.useDataAPI) {
      if (this.enableLocalTesting) {
        this.options = await this.setNewConfig();
      }
      dbConfig = await setupRDSClusterAndData(this.enableLocalTesting, this.options, this.setupQueries);
    } else {
      dbConfig = await setupRDSInstanceAndData(this.options, this.setupQueries);
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

    if (!this.enableLocalTesting) {
      if (this.useDataAPI || !this.options.password) {
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
          this.getConnectionUri(
            engine,
            this.options.username,
            this.options.password,
            dbConfig.endpoint,
            dbConfig.port,
            this.options.dbname,
          ),
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
    } else {
      // this.enableLocalTesting
      const secretArn = dbConfig.secretArn;
      const secretsManagerClient = new SecretsManagerClient({ region: this.options.region });
      const secretManagerCommand = new GetSecretValueCommand({
        SecretId: secretArn,
      });
      const secretsManagerResponse = await secretsManagerClient.send(secretManagerCommand);
      const secretArnWithCustomKey = secretsManagerResponse.ARN; // arn:aws:secretsmanager:us-west-2:637423428135:secret:yjLvhaVbVT-secret-custom-key-BTqGiz
      const keyArn = 'arn:aws:kms:us-west-2:637423428135:key/a84fe5fe-ee01-44bf-b94e-57604a109c77'; // ELVIN - GET THE MASTER CREDENTIALS KMS KEY SOMEHOW (like "arn:aws:kms:us-west-2:637423428135:key/62ec591f-7188-49db-8819-87c15727908f")

      const pathPrefix = `/${this.options.identifier}/test`;
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
          this.getConnectionUri(
            engine,
            this.options.username,
            this.options.password,
            dbConfig.endpoint,
            dbConfig.port,
            this.options.dbname,
          ),
        ],
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

      const identifier = this.options.identifier;
      /*const pathPrefix = `/${identifier}/test`;
      const engine = this.options.engine;
      const dbConnectionConfigSSM = {
        hostnameSsmPath: `${pathPrefix}/hostname`,
        portSsmPath: `${pathPrefix}/port`,
        usernameSsmPath: `${pathPrefix}/username`,
        passwordSsmPath: `${pathPrefix}/password`,
        databaseNameSsmPath: `${pathPrefix}/databaseName`,
      };*/

      /*const dbConnectionStringConfigSSM = {connectionUriSsmPath: `${pathPrefix}/connectionUri`};
      const dbConnectionStringConfigMultiple = {connectionUriSsmPath: [
        `${pathPrefix}/connectionUri/doesnotexist`,
        `${pathPrefix}/connectionUri`,
      ]};*/
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
    }
  };

  cleanupDatabase = async (): Promise<void> => {
    if (!this.databaseDetails || this.enableLocalTesting) {
      // Database has not been set up or using a local test cluster.
      return;
    }

    if (this.useDataAPI) {
      await deleteDBCluster(this.options.identifier, this.options.region);
    } else {
      await deleteDBInstance(this.options.identifier, this.options.region);
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
    return `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostname}:${port}/${dbName}`;
  };
}
