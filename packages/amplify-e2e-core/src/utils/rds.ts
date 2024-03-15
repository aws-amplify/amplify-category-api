import {
  RDSClient,
  CreateDBInstanceCommand,
  CreateDBInstanceCommandInput,
  DBInstance,
  DeleteDBInstanceCommand,
  waitUntilDBInstanceAvailable,
} from '@aws-sdk/client-rds';
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

type RDSConfig = {
  identifier: string;
  engine: 'mysql' | 'postgres';
  dbname: string;
  username: string;
  password?: string;
  region: string;
  instanceClass?: string;
  storage?: number;
  publiclyAccessible?: boolean;
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
  managedSecretArn: string;
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
  const command = new CreateDBInstanceCommand(params);

  try {
    const rdsResponse = await rdsClient.send(command);

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
      masterUserSecret = rdsResponse.DBInstance?.MasterUserSecret;
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
      managedSecretArn: masterUserSecret?.SecretArn,
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error in creating RDS instance.');
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
): Promise<{ endpoint: string; port: number; dbName: string; dbInstance: DBInstance; password: string; managedSecretArn: string }> => {
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
    throw new Error('Error in deleting RDS instance.');
  }
};

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

export const deleteDbConnectionConfig = async (options: {
  region: string;
  hostnameSsmPath: string;
  portSsmPath: string;
  usernameSsmPath: string;
  passwordSsmPath: string;
  databaseNameSsmPath: string;
}): Promise<void> => {
  const ssmClient = new SSMClient({ region: options.region });

  const input: DeleteParametersCommandInput = {
    Names: [options.hostnameSsmPath, options.portSsmPath, options.usernameSsmPath, options.passwordSsmPath, options.databaseNameSsmPath],
  };

  console.log('Deleting SSM parameters');
  await ssmClient.send(new DeleteParametersCommand(input));
};

export const deleteDbConnectionStringConfig = async (options: { region: string; connectionStringSsmPath: string }): Promise<void> => {
  const ssmClient = new SSMClient({ region: options.region });

  const input: DeleteParametersCommandInput = {
    Names: [options.connectionStringSsmPath],
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
  const ssmClient = new SSMClient({ region: options.region });
  const pathPrefix = options.pathPrefix;
  const paths = {
    hostnameSsmPath: '',
    portSsmPath: '',
    usernameSsmPath: '',
    passwordSsmPath: '',
    databaseNameSsmPath: '',
  };

  const keys = ['hostname', 'port', 'username', 'password', 'databaseName'];

  const promises: Promise<PutParameterCommandOutput>[] = [];

  for (const key of keys) {
    const ssmPath = `${pathPrefix}/${key}`;
    paths[`${key}SsmPath`] = ssmPath;

    // Handle non-string values like `port`
    const value = typeof options[key] === 'string' ? options[key] : JSON.stringify(options[key]);
    const input: PutParameterCommandInput = {
      Name: ssmPath,
      Value: value,
      Type: 'SecureString',
      Overwrite: true,
    };

    promises.push(ssmClient.send(new PutParameterCommand(input)));
  }

  await Promise.all(promises);

  return paths;
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
