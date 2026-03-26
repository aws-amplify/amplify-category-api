import { SQLLambdaModelDataSourceStrategy, ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-api-construct';
import { SqlDatabaseDetails } from '../sql-datatabase-controller';

export const dbDetailsToModelDataSourceStrategy = (
  dbDetails: SqlDatabaseDetails,
  name: string,
  dbType: ModelDataSourceStrategySqlDbType,
  connectionConfigsKey?: string,
): SQLLambdaModelDataSourceStrategy => {
  if (!dbDetails) {
    throw new Error('dbDetails is undefined. Database setup may have failed in beforeAll. Check earlier test output for errors.');
  }
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
