import * as path from 'path';
import * as fs from 'fs-extra';
import {
  SqlModelDataSourceDbConnectionConfig,
  SQLLambdaModelDataSourceStrategy,
  ModelDataSourceStrategySqlDbType,
} from '@aws-amplify/graphql-api-construct';
import { isSqlModelDataSourceSecretsManagerDbConnectionConfig } from '@aws-amplify/graphql-transformer-interfaces';
import {
  deleteDBInstance,
  deleteDbConnectionConfigWithSecretsManager,
  deleteDbConnectionConfig,
  extractVpcConfigFromDbInstance,
  setupRDSInstanceAndData,
} from 'amplify-category-api-e2e-core';

export interface ConsolidatedDBDetails {
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

export const cleanupDatabase = async (options: { identifier: string; region: string; dbDetails: ConsolidatedDBDetails }): Promise<void> => {
  const { identifier, region, dbDetails } = options;
  await deleteDBInstance(identifier, region);

  const { connectionConfigs } = dbDetails;

  await Promise.all(
    Object.values(connectionConfigs).map(dbConnectionConfig => {
      if (isSqlModelDataSourceSecretsManagerDbConnectionConfig(dbConnectionConfig)) {
        return deleteDbConnectionConfigWithSecretsManager({
          region,
          secretArn: dbConnectionConfig.secretArn,
        });
      } else {
        return deleteDbConnectionConfig({
          region,
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

export const dbDetailsToModelDataSourceStrategy = (
  dbDetails: ConsolidatedDBDetails,
  name: string,
  dbType: ModelDataSourceStrategySqlDbType,
  connectionConfigsKey?: string,
): SQLLambdaModelDataSourceStrategy => {
  const dbConnectionConfig = connectionConfigsKey
    ? dbDetails.connectionConfigs[connectionConfigsKey]
    : Object.values(dbDetails.connectionConfigs)[0];

  let strategy: SQLLambdaModelDataSourceStrategy = {
    name,
    dbType,
    dbConnectionConfig,
  };

  const { vpcConfig } = dbDetails.dbConfig;
  if (vpcConfig) {
    strategy = {
      ...strategy,
      vpcConfiguration: {
        vpcId: vpcConfig.vpcId,
        securityGroupIds: vpcConfig.securityGroupIds,
        subnetAvailabilityZoneConfig: vpcConfig.subnetAvailabilityZones,
      },
    };
  }
  return strategy;
};

export const setupDatabase = async (options: {
  identifier: string;
  engine: 'mysql' | 'postgres';
  dbname: string;
  queries: string[];
  username: string;
  region: string;
}): Promise<ConsolidatedDBDetails> => {
  const { dbname, identifier, queries } = options;

  console.log(`Setting up database '${identifier}'`);

  const dbConfig = await setupRDSInstanceAndData(options, queries);
  if (!dbConfig) {
    throw new Error('Failed to setup RDS instance');
  }

  return {
    dbConfig: {
      endpoint: dbConfig.endpoint,
      port: dbConfig.port,
      dbName: dbname,
      vpcConfig: extractVpcConfigFromDbInstance(dbConfig.dbInstance),
    },
    connectionConfigs: {
      secretsManagerManagedSecret: {
        databaseName: dbname,
        hostname: dbConfig.endpoint,
        port: dbConfig.port,
        secretArn: dbConfig.managedSecretArn,
      },
    },
  };
};

/**
 * Writes the specified DB details to a file named `db-details.json` in the specified directory. Used to pass db configs from setup code to
 * the CDK app under test. These details only include one of the connection configurations.
 *
 * **NOTE** Do not call this until the CDK project is initialized: `cdk init` fails if the working directory is not empty.
 *
 * @param dbDetails the details object
 * @param projRoot the destination directory to write the `db-details.json` file to
 */
export const writeTestDbDetails = (
  dbDetails: Omit<ConsolidatedDBDetails, 'connectionConfigs'> & { dbConnectionConfig: SqlModelDataSourceDbConnectionConfig },
  projRoot: string,
): void => {
  const detailsStr = JSON.stringify(dbDetails);
  const filePath = path.join(projRoot, 'db-details.json');
  fs.writeFileSync(filePath, detailsStr);
  console.log(`Wrote ${filePath}`);
};
