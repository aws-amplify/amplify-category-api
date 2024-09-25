import {
  RDSClient,
  CreateDBClusterCommand,
  CreateDBInstanceCommand,
  CreateDBInstanceCommandInput,
  DBInstance,
  CreateDBClusterMessage,
  DeleteDBClusterCommand,
  DeleteDBClusterCommandInput,
  DeleteDBInstanceCommand,
  DescribeDBClustersCommand,
  DescribeDBInstancesCommand,
  waitUntilDBClusterAvailable,
  waitUntilDBInstanceAvailable,
} from '@aws-sdk/client-rds';
import { RDSDataClient, ExecuteStatementCommand, ExecuteStatementCommandInput, Field } from '@aws-sdk/client-rds-data';
import generator from 'generate-password';
import { EC2Client, AuthorizeSecurityGroupIngressCommand, RevokeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2';
import {
  SSMClient,
  DeleteParametersCommand,
  DeleteParametersCommandInput,
  PutParameterCommand,
  PutParameterCommandInput,
  PutParameterCommandOutput,
} from '@aws-sdk/client-ssm';
import { SecretsManagerClient, CreateSecretCommand, DeleteSecretCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { KMSClient, CreateKeyCommand, ScheduleKeyDeletionCommand } from '@aws-sdk/client-kms';
import { knex } from 'knex';
import axios from 'axios';
import { sleep } from './sleep';

const DEFAULT_DB_INSTANCE_TYPE = 'db.m5.large';
const DEFAULT_DB_STORAGE = 8;
const DEFAULT_SECURITY_GROUP = 'default';

const IPIFY_URL = 'https://api.ipify.org/';
const AWSCHECKIP_URL = 'https://checkip.amazonaws.com/';

export type SqlEngine = 'mysql' | 'postgres';
export type RDSConfig = {
  identifier: string;
  engine: SqlEngine;
  dbname?: string;
  username: string;
  password?: string;
  region: string;
  instanceClass?: string;
  storage?: number;
  publiclyAccessible?: boolean;
};

export type ClusterInfo = {
  clusterArn: string;
  endpoint: string;
  port: number;
  dbName: string;
  secretArn: string;
  dbInstance: DBInstance;
  username?: string;
};

const getRDSEngineType = (engine: SqlEngine): string => {
  if (engine == 'postgres') {
    return 'aurora-postgresql';
  } else {
    throw new Error('Unsupported engine type for cluster');
  }
};

/**
 * Creates a new RDS instance using the given input configuration and returns the details of the created RDS instance.
 * @param config Configuration of the database instance. If password is not passed an RDS managed password will be created.
 * @returns EndPoint address, port and database name of the created RDS instance.
 */
export const createRDSInstance = async (
  config: RDSConfig,
): Promise<{
  endpoint: string;
  port: number;
  dbName: string;
  dbInstance: DBInstance;
  password: string;
  secretArn: string;
}> => {
  const rdsClient = new RDSClient({ region: config.region });
  const params: CreateDBInstanceCommandInput = {
    /** input parameters */
    DBInstanceClass: config.instanceClass ?? DEFAULT_DB_INSTANCE_TYPE,
    DBInstanceIdentifier: config.identifier,
    AllocatedStorage: config.storage ?? DEFAULT_DB_STORAGE,
    Engine: config.engine,
    DBName: config.dbname,
    MasterUsername: config.username,
    MasterUserPassword: config.password,
    PubliclyAccessible: config.publiclyAccessible ?? true,
    CACertificateIdentifier: 'rds-ca-rsa2048-g1',
    // use RDS managed password, then retrieve the password and store in all other credential store options
    ManageMasterUserPassword: !config.password,
  };
  const createInstanceCommand = new CreateDBInstanceCommand(params);

  try {
    const createInstanceResponse = await rdsClient.send(createInstanceCommand);

    const availableResponse = await waitUntilDBInstanceAvailable(
      {
        maxWaitTime: 3600,
        maxDelay: 120,
        minDelay: 60,
        client: rdsClient,
      },
      {
        DBInstanceIdentifier: config.identifier,
      },
    );

    if (availableResponse.state !== 'SUCCESS') {
      throw new Error('Error in creating a new RDS instance.');
    }

    const dbInstance = availableResponse.reason.DBInstances[0];
    if (!dbInstance) {
      throw new Error('RDS Instance details are missing.');
    }
    let password = config.password;
    let masterUserSecret;
    if (!config.password) {
      masterUserSecret = createInstanceResponse.DBInstance?.MasterUserSecret;
      const secretsManagerClient = new SecretsManagerClient({ region: config.region });
      const secretManagerCommand = new GetSecretValueCommand({
        SecretId: masterUserSecret.SecretArn,
      });
      const secretsManagerResponse = await secretsManagerClient.send(secretManagerCommand);
      const { password: managedPassword } = JSON.parse(secretsManagerResponse.SecretString);
      if (!managedPassword) {
        throw new Error('Unable to get RDS instance master user password');
      }
      password = managedPassword;
    }

    return {
      endpoint: dbInstance.Endpoint.Address as string,
      port: dbInstance.Endpoint.Port as number,
      dbName: dbInstance.DBName as string,
      dbInstance,
      password,
      secretArn: masterUserSecret?.SecretArn,
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error in creating RDS instance.');
  }
};

/**
 * Creates a new RDS Aurora serverless V2 cluster with one DB instance using the given input configuration.
 * @param config Configuration of the database cluster. If password is not passed an RDS managed password will be created.
 * @returns EndPoint address, port and database name of the created RDS cluster.
 */
export const createRDSCluster = async (config: RDSConfig): Promise<ClusterInfo> => {
  const rdsClient = new RDSClient({ region: config.region });
  const initialDBName = 'defaultdb';

  const params: CreateDBClusterMessage = {
    /** input parameters */
    EnableHttpEndpoint: true,
    Engine: getRDSEngineType(config.engine),
    DatabaseName: initialDBName,
    DBClusterIdentifier: config.identifier,
    MasterUsername: config.username,
    // use RDS managed password, then retrieve the password and store in all other credential store options
    ManageMasterUserPassword: true,
    ServerlessV2ScalingConfiguration: {
      MinCapacity: 4,
      MaxCapacity: 10,
    },
  };

  const createClusterCommand = new CreateDBClusterCommand(params);

  const instanceParams: CreateDBInstanceCommandInput = {
    DBInstanceClass: 'db.serverless',
    DBInstanceIdentifier: createInstanceIdentifier(config.identifier),
    Engine: getRDSEngineType(config.engine),
    DBClusterIdentifier: config.identifier,
    PubliclyAccessible: config.publiclyAccessible ?? true,
  };

  const instanceCommand = new CreateDBInstanceCommand(instanceParams);

  try {
    const createClusterResponse = await rdsClient.send(createClusterCommand);

    const availableResponse = await waitUntilDBClusterAvailable(
      {
        maxWaitTime: 3600,
        maxDelay: 120,
        minDelay: 60,
        client: rdsClient,
      },
      {
        DBClusterIdentifier: config.identifier,
      },
    );

    if (availableResponse.state !== 'SUCCESS') {
      throw new Error('Error in creating a new RDS cluster.');
    }

    const dbCluster = availableResponse.reason.DBClusters[0];
    if (!dbCluster) {
      throw new Error('RDS cluster details are missing.');
    }

    const instanceResponse = await rdsClient.send(instanceCommand);
    const availableInstanceResponse = await waitUntilDBInstanceAvailable(
      {
        maxWaitTime: 3600,
        maxDelay: 120,
        minDelay: 60,
        client: rdsClient,
      },
      {
        DBInstanceIdentifier: instanceParams.DBInstanceIdentifier,
      },
    );

    if (availableInstanceResponse.state !== 'SUCCESS') {
      throw new Error('Error in creating a new RDS instance inside the cluster.');
    }

    return {
      clusterArn: dbCluster.DBClusterArn as string,
      endpoint: dbCluster.Endpoint as string,
      port: dbCluster.Port as number,
      dbName: dbCluster.DatabaseName as string,
      secretArn: createClusterResponse.DBCluster.MasterUserSecret.SecretArn,
      dbInstance: instanceResponse?.DBInstance,
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error in creating RDS cluster with an instance.');
  }
};

/**
 * Setup the test database and data in the pre-existing RDS Aurora serverless V2 cluster with one writer DB instance. Get the necessary configuration settings of the cluster and instance.
 * @param identifier Cluster idenfitier.
 * @param config Configuration of the database cluster.
 * @param queries Initial queries to be executed.
 * @returns Cluster configuration information.
 */
export const setupDataInExistingCluster = async (
  identifier: string,
  config: RDSConfig,
  queries: string[],
  secretArn?: string,
): Promise<ClusterInfo> => {
  try {
    const client = new RDSClient({ region: config.region });
    const describeClusterResponse = await client.send(
      new DescribeDBClustersCommand({ Filters: [{ Name: 'db-cluster-id', Values: [identifier] }] }),
    );
    if (!describeClusterResponse || !describeClusterResponse?.DBClusters[0]) {
      throw Error('Specified cluster info cannot be fetched');
    }
    const dbClusterObj = describeClusterResponse.DBClusters[0];
    const instances = dbClusterObj?.DBClusterMembers;
    if (!instances || instances?.length === 0) {
      throw new Error('No instances are present in the specified cluster');
    }
    const instanceId = instances[0]?.DBInstanceIdentifier;
    const describeInstanceCommand = new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId });
    const describeInstanceResponse = await client.send(describeInstanceCommand);
    if (!describeInstanceResponse || describeInstanceResponse?.DBInstances?.length === 0) {
      throw Error('Specified cluster instance info cannot be fetched');
    }

    const clusterArn = dbClusterObj.DBClusterArn;
    // use the provided database user secret or fallback to using master user secret
    const dbUserSecretArn = secretArn || dbClusterObj?.MasterUserSecret?.SecretArn;
    const defaultDbName = dbClusterObj.DatabaseName;
    const dataClient = new RDSDataClient({ region: config.region });
    const sanitizedDbName = config.dbname?.replace(/[^a-zA-Z0-9_]/g, '');

    const createDBInput: ExecuteStatementCommandInput = {
      resourceArn: clusterArn,
      secretArn: dbUserSecretArn,
      sql: `create database ${sanitizedDbName}`,
      database: defaultDbName,
    };

    const createDBCommand = new ExecuteStatementCommand(createDBInput);
    try {
      const createDBResponse = await dataClient.send(createDBCommand);
      console.log('Create database response: ' + JSON.stringify(createDBResponse));
    } catch (err) {
      console.log(err);
    }

    // create the test tables in the test database
    for (const query of queries ?? []) {
      try {
        const executeStatementInput: ExecuteStatementCommandInput = {
          resourceArn: clusterArn,
          secretArn: dbUserSecretArn,
          sql: query,
          database: sanitizedDbName,
        };
        const executeStatementResponse = await dataClient.send(new ExecuteStatementCommand(executeStatementInput));
        console.log('Run query response: ' + JSON.stringify(executeStatementResponse));
      } catch (err) {
        throw new Error(`Error in creating tables in test database: ${JSON.stringify(err, null, 4)}`);
      }
    }

    return {
      clusterArn,
      endpoint: dbClusterObj.Endpoint,
      port: dbClusterObj.Port,
      dbName: sanitizedDbName,
      dbInstance: describeInstanceResponse.DBInstances[0],
      secretArn: dbUserSecretArn,
      username: dbClusterObj.MasterUsername,
    };
  } catch (error) {
    console.log('Error while setting up the test data in existing cluster: ', JSON.stringify(error));
  }
};

/**
 * Creates a new RDS instance using the given input configuration, runs the given queries and returns the details of the created RDS
 * instance.
 * @param config Configuration of the database instance
 * @param queries Initial queries to be executed
 * @returns EndPoint address, port and database name of the created RDS instance.
 */
export const setupRDSInstanceAndData = async (
  config: RDSConfig,
  queries?: string[],
): Promise<{ endpoint: string; port: number; dbName: string; dbInstance: DBInstance; password: string; secretArn: string }> => {
  console.log(`Creating RDS ${config.engine} instance with identifier ${config.identifier}`);
  const dbConfig = await createRDSInstance(config);

  if (queries && queries.length > 0) {
    const ipAddresses = await getIpRanges();
    await Promise.all(
      ipAddresses.map((ip) =>
        addRDSPortInboundRule({
          region: config.region,
          port: dbConfig.port,
          cidrIp: ip,
        }),
      ),
    );

    console.log('Waiting for the security rules to take effect');
    await sleep(1 * 60 * 1000);

    const dbAdapter = new RDSTestDataProvider({
      engine: config.engine,
      host: dbConfig.endpoint,
      port: dbConfig.port,
      username: config.username,
      password: dbConfig.password,
      database: config.dbname,
    });

    console.log('Running initial queries');
    await dbAdapter.runQuery(queries);
    dbAdapter.cleanup();

    await Promise.all(
      ipAddresses.map((ip) =>
        removeRDSPortInboundRule({
          region: config.region,
          port: dbConfig.port,
          cidrIp: ip,
        }),
      ),
    );

    console.log('Waiting for the security rules to be disabled');
    await sleep(1 * 60 * 1000);
  }

  return dbConfig;
};

/**
 * Creates a new RDS Aurora serverless V2 cluster with one DB instance using the given input configuration, runs the given queries and returns the details of the created RDS
 * instance.
 * @param config Configuration of the database cluster
 * @param queries Initial queries to be executed
 * @returns Endpoint address, port and database name of the created RDS cluster.
 */

export const setupRDSClusterAndData = async (config: RDSConfig, queries?: string[]): Promise<ClusterInfo> => {
  console.log(`Creating RDS ${config.engine} DB cluster with identifier ${config.identifier}`);
  const dbCluster = await createRDSCluster(config);

  if (!dbCluster.secretArn) {
    throw new Error('Failed to store db connection config in secrets manager');
  }

  const client = new RDSDataClient({ region: config.region });

  const sanitizedDbName = config.dbname?.replace(/[^a-zA-Z0-9_]/g, '');

  const createDBInput: ExecuteStatementCommandInput = {
    resourceArn: dbCluster.clusterArn,
    secretArn: dbCluster.secretArn,
    sql: `create database ${sanitizedDbName}`,
    database: dbCluster.dbName,
  };

  const createDBCommand = new ExecuteStatementCommand(createDBInput);
  try {
    const createDBResponse = await client.send(createDBCommand);
    console.log('Create database response: ' + JSON.stringify(createDBResponse));
  } catch (err) {
    console.log(err);
  }

  // create the test tables in the test database
  for (const query of queries ?? []) {
    try {
      const executeStatementInput: ExecuteStatementCommandInput = {
        resourceArn: dbCluster.clusterArn,
        secretArn: dbCluster.secretArn,
        sql: query,
        database: sanitizedDbName,
      };
      const executeStatementResponse = await client.send(new ExecuteStatementCommand(executeStatementInput));
      console.log('Run query response: ' + JSON.stringify(executeStatementResponse));
    } catch (err) {
      throw new Error(`Error in creating tables in test database: ${JSON.stringify(err, null, 4)}`);
    }
  }

  return {
    clusterArn: dbCluster.clusterArn,
    endpoint: dbCluster.endpoint,
    port: dbCluster.port,
    dbName: sanitizedDbName,
    dbInstance: dbCluster.dbInstance,
    secretArn: dbCluster.secretArn,
  };
};

/**
 * Clear data/records in the database left by previous test with Data API, only applicable to RDS Aurora Cluster - Postgres SQL instance
 * @param clusterInfo Database cluster config information
 * @param region RDS Aurora cluster region
 * @returns void.
 */
export const clearTestDataUsingDataApi = async (clusterInfo: ClusterInfo, region: string): Promise<void> => {
  const client = new RDSDataClient({ region });

  // Get all table names
  const tableQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'e2e_test_%';
  `;
  const tableQueryInput: ExecuteStatementCommandInput = {
    resourceArn: clusterInfo.clusterArn,
    secretArn: clusterInfo.secretArn,
    sql: tableQuery,
    database: clusterInfo.dbName,
  };

  const tableQueryCommand = new ExecuteStatementCommand(tableQueryInput);
  let tableQueryResponse;
  try {
    tableQueryResponse = await client.send(tableQueryCommand);
  } catch (err) {
    console.log(err);
  }

  const tables: string[] = tableQueryResponse?.records?.map((record) => record[0]?.stringValue) || [];

  // Truncate each table
  for (const table of tables) {
    if (!verifyRDSTableName(table)) {
      throw new Error(`Invalid table name detected in truncating database [${clusterInfo.dbName}]: Table [${table}]`);
    }

    const truncateQuery = `TRUNCATE TABLE ${table} CASCADE;`;
    const truncateQueryInput: ExecuteStatementCommandInput = {
      resourceArn: clusterInfo.clusterArn,
      secretArn: clusterInfo.secretArn,
      sql: truncateQuery,
      database: clusterInfo.dbName,
    };

    const truncateQueryCommand = new ExecuteStatementCommand(truncateQueryInput);
    try {
      await client.send(truncateQueryCommand);
      console.log(`Table truncated: ${table}`);
    } catch (err) {
      console.log(err);
    }
  }

  console.log(`[Postgres] Database [${clusterInfo.dbName}] - data cleared and all tables truncated`);
};

/**
 * Clear data/records in the database left by previous test with Knex direct database connection, applicable to RDS MySQL instance
 * @param config Configuration of the database instance
 * @param endpoint host/endpoint of the RDS instance
 * @param port port of the RDS instance
 * @returns void.
 */
export const clearTestDataUsingDirectConnection = async (config: RDSConfig, endpoint: string, port: number): Promise<void> => {
  const ipAddresses = await getIpRanges();
  await Promise.all(
    ipAddresses.map((ip) =>
      addRDSPortInboundRule({
        region: config.region,
        port: port,
        cidrIp: ip,
      }),
    ),
  );
  console.log('Waiting for the security rules to take effect');
  await sleep(1 * 60 * 1000);

  const dbAdapter = new RDSTestDataProvider({
    engine: config.engine,
    host: endpoint,
    port: port,
    username: config.username,
    password: config.password,
    database: config.dbname,
  });

  try {
    await dbAdapter.executeQuery('SET FOREIGN_KEY_CHECKS = 0');
    const tables = await dbAdapter.executeQuery(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE 'e2e_test\\_%' ESCAPE '\\\\';
    `);

    for (const { TABLE_NAME } of tables) {
      if (!verifyRDSTableName(TABLE_NAME)) {
        throw new Error(`Invalid table name detected in truncating database [${config.dbname}]: Table [${TABLE_NAME}]`);
      }
      await dbAdapter.executeQuery(`TRUNCATE TABLE \`${TABLE_NAME}\`;`);
      console.log(`Table truncated: ${TABLE_NAME}`);
    }

    await dbAdapter.executeQuery('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err) {
    console.log(err);
  }

  dbAdapter.cleanup();

  await Promise.all(
    ipAddresses.map((ip) =>
      removeRDSPortInboundRule({
        region: config.region,
        port: port,
        cidrIp: ip,
      }),
    ),
  );
  console.log('Waiting for the security rules to be disabled');
  await sleep(1 * 60 * 1000);

  console.log(`[MySQL] Database [${config.dbname}] - data cleared and all tables truncated`);
};

/**
 * Deletes the given RDS instance
 * @param identifier RDS Instance identifier to delete
 * @param region RDS Instance region
 */
export const deleteDBInstance = async (identifier: string, region: string): Promise<void> => {
  const client = new RDSClient({ region });
  const params = {
    DBInstanceIdentifier: identifier,
    SkipFinalSnapshot: true,
  };
  const command = new DeleteDBInstanceCommand(params);
  try {
    await client.send(command);

    // TODO: Revisit the below logic for waitUntilDBInstanceDeleted.
    // Right now, when it polls for the status, the database is already deleted and throws 'Resource Not Found'.
    // The deletion has been initiated but it could take few minutes after test completion.

    // await waitUntilDBInstanceDeleted(
    //   {
    //     maxWaitTime: 3600,
    //     maxDelay: 120,
    //     minDelay: 60,
    //     client,
    //   },
    //   {
    //     DBInstanceIdentifier: identifier,
    //   },
    // );
  } catch (error) {
    console.log(error);
    throw new Error(`Error in deleting RDS instance: ${JSON.stringify(error)}`);
  }
};

/**
 * Deletes the given RDS cluster and instances it contains
 * @param identifier RDS cluster identifier to delete
 * @param region RDS cluster region
 */
export const deleteDBCluster = async (identifier: string, region: string): Promise<void> => {
  // First the instance deletion is triggered
  const instanceID = createInstanceIdentifier(identifier);
  console.log(`Deleting instance: ${instanceID}`);
  await deleteDBInstance(instanceID, region);

  // Now delete the cluster
  const client = new RDSClient({ region });
  const params: DeleteDBClusterCommandInput = {
    DBClusterIdentifier: identifier,
    SkipFinalSnapshot: true,
  };
  console.log(`Deleting cluster: ${identifier}`);
  const command = new DeleteDBClusterCommand(params);
  try {
    await client.send(command);
  } catch (error) {
    console.log(error);
    throw new Error(`Error in deleting RDS cluster ${identifier}: ${JSON.stringify(error)}`);
  }
};

const createInstanceIdentifier = (prefix: string): string => {
  return `${prefix}instance`;
};

export const generateDBName = (): string =>
  generator
    .generate({ length: 8 })
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_]/g, '');

/**
 * Adds the given inbound rule to the security group.
 * @param config Inbound rule configuration
 */
export const addRDSPortInboundRule = async (config: {
  region: string;
  port: number;
  securityGroup?: string;
  cidrIp: string;
}): Promise<void> => {
  const ec2_client = new EC2Client({
    region: config.region,
  });

  const command = new AuthorizeSecurityGroupIngressCommand({
    GroupName: config.securityGroup ?? DEFAULT_SECURITY_GROUP,
    FromPort: config.port,
    ToPort: config.port,
    IpProtocol: 'TCP',
    CidrIp: config.cidrIp,
  });

  try {
    console.log(`Security group ${config.securityGroup ?? DEFAULT_SECURITY_GROUP}: Opening inbound port ${config.port}`);
    await ec2_client.send(command);
  } catch (error) {
    // Ignore this error
    // It usually throws error if the security group rule is a duplicate
    // If the rule is not added, we will get an error while establishing connection to the database
  }
};

export const addRDSPortInboundRuleToGroupId = async (config: {
  region: string;
  port: number;
  securityGroupId: string;
  cidrIp: string;
}): Promise<void> => {
  const ec2_client = new EC2Client({
    region: config.region,
  });

  const command = new AuthorizeSecurityGroupIngressCommand({
    GroupId: config.securityGroupId,
    FromPort: config.port,
    ToPort: config.port,
    IpProtocol: 'TCP',
    CidrIp: config.cidrIp,
  });

  try {
    console.log(`Security group ${config.securityGroupId}: Opening inbound port ${config.port}`);
    await ec2_client.send(command);
  } catch (error) {
    console.log(error);
    // Ignore this error
    // It usually throws error if the security group rule is a duplicate
    // If the rule is not added, we will get an error while establishing connection to the database
  }
};

/**
 * Removes the given Inbound rule to the security group
 * @param config Inbound rule configuration
 */
export const removeRDSPortInboundRule = async (config: {
  region: string;
  port: number;
  securityGroup?: string;
  cidrIp: string;
}): Promise<void> => {
  const ec2_client = new EC2Client({
    region: config.region,
  });

  const command = new RevokeSecurityGroupIngressCommand({
    GroupName: config.securityGroup ?? DEFAULT_SECURITY_GROUP,
    FromPort: config.port,
    ToPort: config.port,
    IpProtocol: 'TCP',
    CidrIp: config.cidrIp,
  });

  try {
    console.log(`Security group ${config.securityGroup ?? DEFAULT_SECURITY_GROUP}: Removing inbound port ${config.port}`);
    await ec2_client.send(command);
  } catch (error) {
    // Ignore this error
    // It usually throws error if the security group rule is a duplicate
    // If the rule is not added, we will get an error while establishing connection to the database
  }
};

export class RDSTestDataProvider {
  private dbBuilder: any;

  constructor(
    private config: {
      engine?: string;
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    },
  ) {
    this.establishDatabaseConnection();
  }

  private establishDatabaseConnection(): void {
    console.log(`Establishing database connection to ${this.config.host}`);
    const databaseConfig = {
      host: this.config.host,
      database: this.config.database,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      ssl: { rejectUnauthorized: false },
    };
    try {
      this.dbBuilder = knex({
        client: this.config.engine === 'postgres' ? 'pg' : 'mysql2',
        connection: databaseConfig,
        pool: {
          min: 0,
          max: 1,
          createTimeoutMillis: 30000,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
        debug: false,
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }

  public async runQuery(statements: string[]): Promise<void> {
    for (const statement of statements) {
      await this.dbBuilder.raw(statement);
    }
  }

  public async executeQuery(statement: string): Promise<any> {
    const result = await this.dbBuilder.raw(statement);
    return result[0];
  }
}

export const getResource = (resources: Map<string, any>, resourcePrefix: string, resourceType: string): any => {
  const keys = Array.from(Object.keys(resources)).filter((key) => key.startsWith(resourcePrefix));
  for (const key of keys) {
    const resource = resources[key];
    if (resource.Type === resourceType) {
      return resource;
    }
  }
  return undefined;
};

export const getIpRanges = async (): Promise<string[]> => {
  return Promise.all(
    [IPIFY_URL, AWSCHECKIP_URL].map(async (url) => {
      const response = await axios(url);
      const ipParts = response.data.trim().split('.');
      return `${ipParts[0]}.${ipParts[1]}.0.0/16`;
    }),
  );
};

export const deleteSSMParameters = async (options: { region: string; parameterNames: string[] }): Promise<void> => {
  const ssmClient = new SSMClient({ region: options.region });

  const input: DeleteParametersCommandInput = {
    Names: options.parameterNames,
  };

  console.log('Deleting SSM parameters');
  await ssmClient.send(new DeleteParametersCommand(input));
};

export const storeDbConnectionConfig = async (options: {
  region: string;
  pathPrefix: string;
  hostname: string;
  port: number;
  username: string;
  password: string;
  databaseName: string;
}): Promise<{
  hostnameSsmPath: string;
  portSsmPath: string;
  usernameSsmPath: string;
  passwordSsmPath: string;
  databaseNameSsmPath: string;
}> => {
  await storeSSMParameters({
    region: options.region,
    pathPrefix: options.pathPrefix,
    parameters: {
      hostname: options.hostname,
      port: options.port.toString(),
      username: options.username,
      password: options.password,
      databaseName: options.databaseName,
    },
  });
  return {
    hostnameSsmPath: `${options.pathPrefix}/hostname`,
    portSsmPath: `${options.pathPrefix}/port`,
    usernameSsmPath: `${options.pathPrefix}/username`,
    passwordSsmPath: `${options.pathPrefix}/password`,
    databaseNameSsmPath: `${options.pathPrefix}/databaseName`,
  };
};

export const storeDbConnectionStringConfig = async (options: {
  region: string;
  pathPrefix: string;
  connectionUri: string | string[];
}): Promise<{
  connectionUriSsmPath: string | string[];
}> => {
  if (typeof options.connectionUri === 'string') {
    await storeSSMParameters({
      region: options.region,
      pathPrefix: options.pathPrefix,
      parameters: {
        connectionUri: options.connectionUri,
      },
    });
    return {
      connectionUriSsmPath: `${options.pathPrefix}/connectionUri`,
    };
  } else {
    await storeSSMParameters({
      region: options.region,
      pathPrefix: options.pathPrefix,
      parameters: {
        connectionUri: options.connectionUri[1],
      },
    });
    return {
      connectionUriSsmPath: [`${options.pathPrefix}/connectionUri/doesnotexist`, `${options.pathPrefix}/connectionUri`],
    };
  }
};

export const storeSSMParameters = async (options: { region: string; pathPrefix: string; parameters: Record<string, string> }) => {
  const ssmClient = new SSMClient({ region: options.region });
  const pathPrefix = options.pathPrefix;
  const promises: Promise<PutParameterCommandOutput>[] = [];

  for (const parameterName in options.parameters) {
    const ssmPath = `${pathPrefix}/${parameterName}`;
    const value = options.parameters[parameterName];

    const input: PutParameterCommandInput = {
      Name: ssmPath,
      Value: value,
      Type: 'SecureString',
      Overwrite: true,
    };

    promises.push(ssmClient.send(new PutParameterCommand(input)));
  }

  await Promise.all(promises);
};

export const deleteDbConnectionConfigWithSecretsManager = async (options: {
  region: string;
  secretArn: string;
  keyArn?: string;
}): Promise<void> => {
  console.log('Deleting secret from Secrets Manager');
  const secretsManagerClient = new SecretsManagerClient({ region: options.region });

  await secretsManagerClient.send(new DeleteSecretCommand({ SecretId: options.secretArn }));
  if (options.keyArn) {
    const kmsClient = new KMSClient({ region: options.region });
    // 7 days is the lowest possible value for the pending window
    await kmsClient.send(new ScheduleKeyDeletionCommand({ KeyId: options.keyArn, PendingWindowInDays: 7 }));
  }
};

export const storeDbConnectionConfigWithSecretsManager = async (options: {
  region: string;
  secretName: string;
  username: string;
  password: string;
  useCustomEncryptionKey?: boolean;
}): Promise<{ secretArn: string; keyArn?: string }> => {
  let encryptionKey = undefined;
  if (options.useCustomEncryptionKey) {
    const kmsClient = new KMSClient({ region: options.region });
    const response = await kmsClient.send(new CreateKeyCommand({}));
    encryptionKey = response.KeyMetadata;
  }
  const secretsManagerClient = new SecretsManagerClient({ region: options.region });
  const response = await secretsManagerClient.send(
    new CreateSecretCommand({
      Name: options.secretName,
      SecretString: JSON.stringify({ username: options.username, password: options.password }),
      KmsKeyId: encryptionKey?.KeyId,
    }),
  );
  return { secretArn: response.ARN, keyArn: encryptionKey?.Arn };
};

export const extractVpcConfigFromDbInstance = (
  dbInstance: DBInstance,
): {
  vpcId: string;
  securityGroupIds: string[];
  subnetAvailabilityZones: {
    subnetId: string;
    availabilityZone: string;
  }[];
} => {
  const subnetAvailabilityZones = dbInstance.DBSubnetGroup.Subnets.map((subnet) => ({
    subnetId: subnet.SubnetIdentifier,
    availabilityZone: subnet.SubnetAvailabilityZone.Name,
  }));

  return {
    vpcId: dbInstance.DBSubnetGroup.VpcId,
    securityGroupIds: dbInstance.VpcSecurityGroups.map((sg) => sg.VpcSecurityGroupId),
    subnetAvailabilityZones,
  };
};

export const getRDSTableNamePrefix = () => {
  return 'e2e_test_';
};

export function verifyRDSTableName(tableName: string): boolean {
  const prefix = getRDSTableNamePrefix();

  // Check if the table name starts with the correct prefix
  if (!tableName.startsWith(prefix)) {
    return false;
  }

  // Remove the prefix for further validation
  const nameWithoutPrefix = tableName.slice(prefix.length);

  // Check if the remaining part of the name is valid
  // This regex allows alphanumeric characters and underscores
  // It also ensures the name doesn't start with a number
  const validNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  return validNameRegex.test(nameWithoutPrefix);
}
