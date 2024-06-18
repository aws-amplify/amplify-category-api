import { isDynamoDbType } from '@aws-amplify/graphql-transformer-core';
import { ImportedAmplifyDynamoDbModelDataSourceStrategy, ModelDataSourceStrategy } from '../model-datasource-strategy-types';
import { IAmplifyGraphqlDefinition } from '../types';

export const validateImportedTableMap = (definition: IAmplifyGraphqlDefinition, importedTableMap?: Record<string, string>): void => {
  const { dataSourceStrategies } = definition;
  const importedModels = Object.keys(dataSourceStrategies).filter((modelTypeName) =>
    isImportedAmplifyDynamoDbModelDataSourceStrategy(dataSourceStrategies[modelTypeName]),
  );
  if (importedModels.length > 0) {
    if (importedModels.length < Object.keys(importedTableMap || {}).length) {
      throw new Error('Table mapping does not include a mapping for all models.');
    }
    if (!importedTableMap) {
      throw new Error('Table mapping is missing for imported Amplify DynamoDB table strategy');
    }
    importedModels.forEach((modelName) => {
      if (!importedTableMap[modelName]) {
        throw new Error(`Cannot find imported Amplify DynamoDB table mapping for model ${modelName}`);
      }
    });
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
