import { isDynamoDbType } from '@aws-amplify/graphql-transformer-core';
import { ImportedAmplifyDynamoDbModelDataSourceStrategy, ModelDataSourceStrategy } from '../model-datasource-strategy-types';
import { IAmplifyGraphqlDefinition } from '../types';

export const validateImportedTableMap = (definition: IAmplifyGraphqlDefinition, importedTableMap?: Record<string, string>): void => {
  const { dataSourceStrategies } = definition;
  const importedModels = Object.keys(dataSourceStrategies).filter((modelTypeName) =>
    isImportedAmplifyDynamoDbModelDataSourceStrategy(dataSourceStrategies[modelTypeName]),
  );
  const modelsInMap = Object.keys(importedTableMap || {});
  if (importedModels.length < modelsInMap.length) {
    const missingModels = modelsInMap.filter((model) => !importedModels.includes(model));
    throw new Error(`Table mapping includes tables not specified as imported in schema. (${missingModels.join(', ')})`);
  }
  if (importedModels.length > 0) {
    if (!importedTableMap) {
      throw new Error('Table mapping is missing for imported Amplify DynamoDB table strategy.');
    }
    const missingModels = importedModels.filter((model) => !modelsInMap.includes(model));
    if (missingModels.length > 0) {
      throw new Error(`Cannot find imported Amplify DynamoDB table mapping for models ${missingModels.join(', ')}.`);
    }
  }
};

/**
 * Type predicate that returns true if `obj` is a AmplifyDynamoDbModelDataSourceStrategy
 */
export const isImportedAmplifyDynamoDbModelDataSourceStrategy = (
  strategy: ModelDataSourceStrategy,
): strategy is ImportedAmplifyDynamoDbModelDataSourceStrategy => {
  return (
    isDynamoDbType(strategy.dbType) &&
    typeof (strategy as any)['provisionStrategy'] === 'string' &&
    (strategy as any)['provisionStrategy'] === 'IMPORTED_AMPLIFY_TABLE'
  );
};
