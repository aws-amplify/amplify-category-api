import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';

/**
 * A wrapper around the RDS data service client, forming their responses for
 * easier consumption.
 */
export class AuroraDataAPIClient {
  AWSConfig: any;

  RDS: any;

  Params: DataApiParams;

  setRDSClient(rdsClient: any) {
    this.RDS = rdsClient;
  }

  constructor(databaseRegion: string, awsSecretStoreArn: string, dbClusterOrInstanceArn: string, database: string, awsConfig: any) {
    this.AWSConfig = awsConfig;
    const config = { ...this.AWSConfig, region: databaseRegion };

    this.RDS = new RDSDataClient(config);
    this.Params = new DataApiParams();

    this.Params.secretArn = awsSecretStoreArn;
    this.Params.resourceArn = dbClusterOrInstanceArn;
    this.Params.database = database;
  }

  /**
   * Lists all of the tables in the set database.
   *
   * @return a list of tables in the database.
   */
  public listTables = async () => {
    this.Params.sql = 'SHOW TABLES';
    const response = await this.RDS.send(new ExecuteStatementCommand(this.Params));

    let tableList = [];
    const records = response['records'];
    for (const record of records) {
      tableList.push(record[0]['stringValue']);
    }

    return tableList;
  };

  /**
   * Describes the table given, by breaking it down into individual column descriptions.
   *
   * @param the name of the table to be described.
   * @return a list of column descriptions.
   */
  public describeTable = async (tableName: string) => {
    this.Params.sql = `DESCRIBE \`${tableName}\``;
    const response = await this.RDS.send(new ExecuteStatementCommand(this.Params));
    const listOfColumns = response['records'];
    let columnDescriptions = [];
    for (const column of listOfColumns) {
      let colDescription = new ColumnDescription();

      colDescription.Field = column[MYSQL_DESCRIBE_TABLE_ORDER.Field]['stringValue'];
      colDescription.Type = column[MYSQL_DESCRIBE_TABLE_ORDER.Type]['stringValue'];
      colDescription.Null = column[MYSQL_DESCRIBE_TABLE_ORDER.Null]['stringValue'];
      colDescription.Key = column[MYSQL_DESCRIBE_TABLE_ORDER.Key]['stringValue'];
      colDescription.Default = column[MYSQL_DESCRIBE_TABLE_ORDER.Default]['stringValue'];
      colDescription.Extra = column[MYSQL_DESCRIBE_TABLE_ORDER.Extra]['stringValue'];

      columnDescriptions.push(colDescription);
    }

    return columnDescriptions;
  };

  /**
   * Gets foreign keys for the given table, if any exist.
   *
   * @param tableName the name of the table to be checked.
   * @return a list of tables referencing the provided table, if any exist.
   */
  public getTableForeignKeyReferences = async (tableName: string) => {
    this.Params.sql = `SELECT TABLE_NAME FROM information_schema.key_column_usage 
            WHERE referenced_table_name is not null 
            AND REFERENCED_TABLE_NAME = '${tableName}';`;
    const response = await this.RDS.send(new ExecuteStatementCommand(this.Params));

    let tableList = [];
    const records = response['records'];
    for (const record of records) {
      tableList.push(record[0]['stringValue']);
    }

    return tableList;
  };
}

export class DataApiParams {
  database: string;

  secretArn: string;

  resourceArn: string;

  sql: string;
}

export class ColumnDescription {
  Field: string;

  Type: string;

  Null: string;

  Key: string;

  Default: string;

  Extra: string;
}

enum MYSQL_DESCRIBE_TABLE_ORDER {
  Field,
  Type,
  Null,
  Key,
  Default,
  Extra,
}
