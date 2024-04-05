import * as path from 'path';
import * as fs from 'fs-extra';
import {
  SqlModelDataSourceDbConnectionConfig,
  SQLLambdaModelDataSourceStrategy,
  ModelDataSourceStrategySqlDbType,
} from '@aws-amplify/graphql-api-construct';

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
