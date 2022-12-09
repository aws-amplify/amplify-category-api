import { 
  RDSClient,
  CreateDBInstanceCommand,
  waitUntilDBInstanceAvailable,
  DeleteDBInstanceCommand,
  waitUntilDBInstanceDeleted 
} from "@aws-sdk/client-rds";
import { EC2Client, AuthorizeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2';
import { knex } from 'knex';

const DEFAULT_DB_INSTANCE_TYPE = "db.m5.large";
const DEFAULT_DB_STORAGE = 8;
const DEFAULT_SECURITY_GROUP = "default";

export const createRDSInstance = async (config: {
  identifier: string,
  engine: 'mysql',
  dbname: string,
  username: string,
  password: string,
  region: string,
  instanceClass?: string,
  storage?: number,
}) => {
  const client = new RDSClient({ region: config.region });
  const params = {
    /** input parameters */
    "DBInstanceClass": config.instanceClass ?? DEFAULT_DB_INSTANCE_TYPE,
    "DBInstanceIdentifier": config.identifier,
    "AllocatedStorage": config.storage ?? DEFAULT_DB_STORAGE,
    "Engine": config.engine,
    "DBName": config.dbname,
    "MasterUsername": config.username,
    "MasterUserPassword": config.password,
  };
  const command = new CreateDBInstanceCommand(params);
  
  try {
    await client.send(command);
    const availableResponse = await waitUntilDBInstanceAvailable(
      {
        maxWaitTime: 3600,
        maxDelay: 120,
        minDelay: 60,
        client,
      },
      {
        DBInstanceIdentifier: config.identifier,
      },
    );

    const dbInstance = (availableResponse as any).DBInstances[0];
    if (!dbInstance) {
      throw new Error("RDS Instance details are missing.");
    }

    return {
      endpoint: dbInstance.Endpoint.Address,
      port: dbInstance.Endpoint.Port,
      dbName: dbInstance.DBName,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Error in creating RDS instance.");
  }
};

export const deleteDBInstance = async (identifier: string, region: string) => {
  const client = new RDSClient({ region });
  const params = {
    "DBInstanceIdentifier": identifier,
    "SkipFinalSnapshot": true,
  };
  const command = new DeleteDBInstanceCommand(params);
  try {
    await client.send(command);
    await waitUntilDBInstanceDeleted(
      {
        maxWaitTime: 3600,
        maxDelay: 120,
        minDelay: 60,
        client,
      },
      {
        DBInstanceIdentifier: identifier,
      },
    );
  } catch (error) {
    console.log(error);
    throw new Error("Error in deleting RDS instance.");
  }  
};

export const addRDSPortInboundRule = async (config: {
  region: string,
  port: number,
  securityGroup?: string,
}) => {
  const ec2_client = new EC2Client({
    region: config.region,
  });
  
  const command = new AuthorizeSecurityGroupIngressCommand({
    GroupName: config.securityGroup ?? DEFAULT_SECURITY_GROUP,
    FromPort: config.port,
    ToPort: config.port,
    IpProtocol: "TCP",
    CidrIp: "0.0.0.0/0",
  });
  
  try {
    await ec2_client.send(command);
  } catch (error) {
    // Ignore this error
    // It usually throws error if the security group rule is a duplicate
    // If the rule is not added, we will get an error while establishing connection to the database
  } 
};

export class RDSTestDataProvider {
  private dbBuilder: any;

  constructor(private config: {
    host: string,
    port: number,
    username: string,
    password: string,
    database: string,
  }) {
    this.establishDatabaseConnection();
  }

  private establishDatabaseConnection() {
    const databaseConfig = {
      host: this.config.host,
      database: this.config.database,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      ssl: { rejectUnauthorized: false},
    };
    try {
      this.dbBuilder = knex({
        client: 'mysql2',
        connection: databaseConfig,
        pool: {
          min: 5, 
          max: 30,
          createTimeoutMillis: 30000,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100
        },
        debug: false,
      });
    }
    catch(err) {
      console.log(err);
      throw err;
    }
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }

  public async runQuery(statements: string[]) {
    for (const statement of statements) {
      await this.dbBuilder.raw(statement);
    }
  }
}
