import {
  DDB_DB_TYPE,
  MYSQL_DB_TYPE
} from '@aws-amplify/graphql-transformer-core';
import {
  ModelDataSourceDefinition,
  ModelDataSourceDefinitionDbType,
  SQLLambdaModelDataSourceDefinitionStrategy
} from '@aws-amplify/graphql-transformer-interfaces';

export const getDbType = (definition: ModelDataSourceDefinition): ModelDataSourceDefinitionDbType => {
  return definition.strategy.dbType;
};

/** True if the definition's strategy uses a DynamoDB dbType */
export const isDynamoDbType = (def: ModelDataSourceDefinition): boolean => {
  return getDbType(def) === DDB_DB_TYPE;
};

/** True if the definition's strategy uses a SQL dbType */
const isSqlDbType = (def: ModelDataSourceDefinition): boolean => {
  return getDbType(def) === MYSQL_DB_TYPE;
};

/** True if the definition's strategy uses a DynamoDB dbType and provisionStrategy is DEFAULT. */
export const isProvisionedDdbDataSource = (def: ModelDataSourceDefinition): boolean => {
  if (!isDynamoDbType(def)) {
    return false;
  }

  const {
    strategy: {
      provisionStrategy,
    }
  } = def as any;
  return provisionStrategy && provisionStrategy === 'DEFAULT';
};

/** True if the definition uses a known SQL dbType and has a DB connection configuration */
export const isSqlLambdaDatasource = (def: ModelDataSourceDefinition): def is {
  name: string,
  strategy: SQLLambdaModelDataSourceDefinitionStrategy
} => {
  if (!isSqlDbType(def)) {
    return false;
  }

  const {
    strategy: {
      dbConnectionConfig,
    }
  } = def as any;
  return (
    typeof (dbConnectionConfig) === 'object' &&
    typeof (dbConnectionConfig['hostnameSsmPath']) === 'string' &&
    typeof (dbConnectionConfig['usernameSsmPath']) === 'string' &&
    typeof (dbConnectionConfig['passwordSsmPath']) === 'string' &&
    typeof (dbConnectionConfig['portSsmPath']) === 'string' &&
    typeof (dbConnectionConfig['databaseNameSsmPath']) === 'string'
  );
};
