import isEqual from 'lodash.isequal';
import { DynamoDB, TableDescription, CreateTableCommandInput, AttributeDefinition, KeySchemaElement } from '@aws-sdk/client-dynamodb';

/**
 * Imports an existing DDB table.
 * This should only be used for tables that were created by Amplify.
 * @param createTableInput Create table input for the table to import. The attributes will be compared against the imported table.
 */
export const importTable = async (createTableInput: CreateTableCommandInput): Promise<AWSCDKAsyncCustomResource.OnEventResponse> => {
  const ddbClient = new DynamoDB();
  console.log('Initiating table import process');
  console.log(`Fetching current state of table ${createTableInput.TableName}`);
  const describeTableResult = await ddbClient.describeTable({ TableName: createTableInput.TableName });
  if (!describeTableResult.Table) {
    throw new Error(`Could not find ${createTableInput.TableName} to update`);
  }
  console.log('Current table state: ', describeTableResult);
  const expectedTableProperties = getExpectedTableProperties(createTableInput);
  const importedTableProperties = getImportedTableComparisonProperties(describeTableResult.Table);
  validateImportedTableProperties(importedTableProperties, expectedTableProperties);
  const result = {
    PhysicalResourceId: describeTableResult.Table.TableName,
    Data: {
      TableArn: describeTableResult.Table.TableArn,
      TableStreamArn: describeTableResult.Table.LatestStreamArn,
      TableName: describeTableResult.Table.TableName,
    },
  };
  console.log('Returning result: ', result);
  return result;
};

/**
 * Util function to validate imported table properties against expected properties.
 * @param importedTableProperties table to import
 * @param expectedTableProperties expected properties that the imported table is validated against
 * @throws Will throw if any properties do not match the expected values
 */
export const validateImportedTableProperties = (
  importedTableProperties: TableComparisonProperties,
  expectedTableProperties: TableComparisonProperties,
): void => {
  const errors: string[] = [];

  // assert the imported properties match the expected properties. If they do not match, add an error message to the errors array
  const assertEqual = (
    propertyName: string,
    imported: TableComparisonProperties[keyof TableComparisonProperties],
    expected: TableComparisonProperties[keyof TableComparisonProperties],
  ): void => {
    if (!isEqual(imported, expected)) {
      errors.push(
        `${propertyName} does not match the expected value.\nImported Value: ${JSON.stringify(imported)}\nExpected: ${JSON.stringify(
          expected,
        )}`,
      );
    }
  };

  const sanitizedImportedTableProperties = sanitizeTableProperties(importedTableProperties);
  const sanitizedExpectedTableProperties = sanitizeTableProperties(expectedTableProperties);

  // TODO: need to sort some properties
  assertEqual(
    'AttributeDefinitions',
    sanitizedImportedTableProperties.AttributeDefinitions,
    sanitizedExpectedTableProperties.AttributeDefinitions,
  );
  assertEqual('KeySchema', sanitizedImportedTableProperties.KeySchema, sanitizedExpectedTableProperties.KeySchema);
  assertEqual(
    'GlobalSecondaryIndexes',
    sanitizedImportedTableProperties.GlobalSecondaryIndexes,
    sanitizedExpectedTableProperties.GlobalSecondaryIndexes,
  );
  assertEqual(
    'BillingModeSummary',
    sanitizedImportedTableProperties.BillingModeSummary,
    sanitizedExpectedTableProperties.BillingModeSummary,
  );
  assertEqual(
    'ProvisionedThroughput',
    sanitizedImportedTableProperties.ProvisionedThroughput,
    sanitizedExpectedTableProperties.ProvisionedThroughput,
  );
  assertEqual(
    'StreamSpecification',
    sanitizedImportedTableProperties.StreamSpecification,
    sanitizedExpectedTableProperties.StreamSpecification,
  );
  assertEqual('SSEDescription', sanitizedImportedTableProperties.SSEDescription, sanitizedExpectedTableProperties.SSEDescription);
  assertEqual(
    'DeletionProtectionEnabled',
    sanitizedImportedTableProperties.DeletionProtectionEnabled,
    sanitizedExpectedTableProperties.DeletionProtectionEnabled,
  );

  if (errors.length > 0) {
    throw new Error(`Imported table properties did not match the expected table properties.\n${errors.join('\n')}`);
  }
};

export type TableComparisonProperties = Partial<
  Pick<
    TableDescription,
    | 'AttributeDefinitions'
    | 'KeySchema'
    | 'GlobalSecondaryIndexes'
    | 'BillingModeSummary'
    | 'ProvisionedThroughput'
    | 'StreamSpecification'
    | 'SSEDescription'
    | 'DeletionProtectionEnabled'
  >
>;

/**
 * Get the expected table properties given the input properties.
 * This is used to ensure the imported table matches the input properties.
 *
 * @param createTableInput input properties for the table creation.
 */
export const getExpectedTableProperties = (createTableInput: CreateTableCommandInput): TableComparisonProperties => {
  return {
    AttributeDefinitions: getExpectedAttributeDefinitions(createTableInput),
    KeySchema: getExpectedKeySchema(createTableInput),
    GlobalSecondaryIndexes: getExpectedGlobalSecondaryIndexes(createTableInput),
    BillingModeSummary: getExpectedBillingModeSummary(createTableInput),
    ProvisionedThroughput: getExpectedProvisionedThroughput(createTableInput),
    StreamSpecification: getExpectedStreamSpecification(createTableInput),
    SSEDescription: getExpectedSSEDescription(createTableInput),
    DeletionProtectionEnabled: getExpectedDeletionProtectionEnabled(createTableInput),
  };
};

const getExpectedAttributeDefinitions = (createTableInput: CreateTableCommandInput): TableComparisonProperties['AttributeDefinitions'] => {
  return createTableInput.AttributeDefinitions;
};

const getExpectedKeySchema = (createTableInput: CreateTableCommandInput): TableComparisonProperties['KeySchema'] => {
  return createTableInput.KeySchema;
};

const getExpectedGlobalSecondaryIndexes = (
  createTableInput: CreateTableCommandInput,
): TableComparisonProperties['GlobalSecondaryIndexes'] => {
  return createTableInput.GlobalSecondaryIndexes?.map((gsi) => {
    if (createTableInput.BillingMode === 'PAY_PER_REQUEST') {
      // When the billing mode is PAY_PER_REQUEST, the ProvisionedThroughput read and write capacity units will be 0
      // even if a different number is supplied
      return {
        ...gsi,
        ProvisionedThroughput: gsi.ProvisionedThroughput
          ? {
              ReadCapacityUnits: 0,
              WriteCapacityUnits: 0,
            }
          : undefined,
      };
    }
    return gsi;
  });
};

const getExpectedBillingModeSummary = (createTableInput: CreateTableCommandInput): TableComparisonProperties['BillingModeSummary'] => {
  return {
    BillingMode: createTableInput.BillingMode,
  };
};

const getExpectedStreamSpecification = (createTableInput: CreateTableCommandInput): TableComparisonProperties['StreamSpecification'] => {
  return createTableInput.StreamSpecification;
};

const getExpectedProvisionedThroughput = (
  createTableInput: CreateTableCommandInput,
): TableComparisonProperties['ProvisionedThroughput'] => {
  return createTableInput.ProvisionedThroughput || { ReadCapacityUnits: 0, WriteCapacityUnits: 0 };
};

const getExpectedSSEDescription = (createTableInput: CreateTableCommandInput): TableComparisonProperties['SSEDescription'] => {
  return createTableInput.SSESpecification && createTableInput.SSESpecification.Enabled
    ? {
        SSEType: createTableInput.SSESpecification.SSEType || 'KMS',
        Status: 'ENABLED',
      }
    : undefined;
};

const getExpectedDeletionProtectionEnabled = (
  createTableInput: CreateTableCommandInput,
): TableComparisonProperties['DeletionProtectionEnabled'] => {
  return createTableInput.DeletionProtectionEnabled || false;
};

/**
 * Get the properties that should be used to compare to the expected properties.
 * @param importedTable
 * @returns properties to compare against the expected properties
 */
export const getImportedTableComparisonProperties = (importedTable: TableDescription): TableComparisonProperties => {
  return {
    AttributeDefinitions: getAttributeDefinitionsForComparison(importedTable),
    KeySchema: getKeySchemaForComparison(importedTable),
    GlobalSecondaryIndexes: getGlobalSecondaryIndexesForComparison(importedTable),
    BillingModeSummary: getBillingModeSummaryForComparison(importedTable),
    ProvisionedThroughput: getProvisionedThroughputForComparison(importedTable),
    StreamSpecification: getStreamSpecificationForComparison(importedTable),
    SSEDescription: getSSEDescriptionForComparison(importedTable),
    DeletionProtectionEnabled: getDeletionProtectionEnabledForComparison(importedTable),
  };
};

const getAttributeDefinitionsForComparison = (importedTable: TableDescription): TableComparisonProperties['AttributeDefinitions'] => {
  return importedTable.AttributeDefinitions?.map((attributeDefinition) => ({
    AttributeName: attributeDefinition.AttributeName,
    AttributeType: attributeDefinition.AttributeType,
  }));
};

const getKeySchemaForComparison = (importedTable: TableDescription): TableComparisonProperties['KeySchema'] => {
  return importedTable.KeySchema?.map((key) => ({
    AttributeName: key.AttributeName,
    KeyType: key.KeyType,
  }));
};

const getGlobalSecondaryIndexesForComparison = (importedTable: TableDescription): TableComparisonProperties['GlobalSecondaryIndexes'] => {
  return importedTable.GlobalSecondaryIndexes?.map((gsi) => ({
    IndexName: gsi.IndexName,
    KeySchema: gsi.KeySchema?.map((key) => ({
      AttributeName: key.AttributeName,
      KeyType: key.KeyType,
    })),
    OnDemandThroughput: gsi.OnDemandThroughput
      ? {
          MaxReadRequestUnits: gsi.OnDemandThroughput.MaxReadRequestUnits,
          MaxWriteRequestUnits: gsi.OnDemandThroughput.MaxWriteRequestUnits,
        }
      : undefined,
    Projection: gsi.Projection
      ? {
          NonKeyAttributes: gsi.Projection.NonKeyAttributes,
          ProjectionType: gsi.Projection.ProjectionType,
        }
      : undefined,
    ProvisionedThroughput: gsi.ProvisionedThroughput
      ? {
          ReadCapacityUnits: gsi.ProvisionedThroughput.ReadCapacityUnits,
          WriteCapacityUnits: gsi.ProvisionedThroughput.WriteCapacityUnits,
        }
      : undefined,
  }));
};

const getBillingModeSummaryForComparison = (importedTable: TableDescription): TableComparisonProperties['BillingModeSummary'] => {
  return importedTable.BillingModeSummary
    ? {
        BillingMode: importedTable.BillingModeSummary.BillingMode,
      }
    : undefined;
};

const getProvisionedThroughputForComparison = (importedTable: TableDescription): TableComparisonProperties['ProvisionedThroughput'] => {
  return importedTable.ProvisionedThroughput
    ? {
        ReadCapacityUnits: importedTable.ProvisionedThroughput.ReadCapacityUnits,
        WriteCapacityUnits: importedTable.ProvisionedThroughput.WriteCapacityUnits,
      }
    : undefined;
};

const getStreamSpecificationForComparison = (importedTable: TableDescription): TableComparisonProperties['StreamSpecification'] => {
  return importedTable.StreamSpecification
    ? {
        StreamEnabled: importedTable.StreamSpecification?.StreamEnabled,
        StreamViewType: importedTable.StreamSpecification?.StreamViewType,
      }
    : undefined;
};

const getSSEDescriptionForComparison = (importedTable: TableDescription): TableComparisonProperties['SSEDescription'] => {
  return importedTable.SSEDescription
    ? {
        SSEType: importedTable.SSEDescription.SSEType,
      }
    : undefined;
};

const getDeletionProtectionEnabledForComparison = (
  importedTable: TableDescription,
): TableComparisonProperties['DeletionProtectionEnabled'] => {
  return importedTable.DeletionProtectionEnabled;
};

/**
 * Remove undefined attributes from the objects.
 * lodash isEqual treats undefined as a value when comparing objects
 * Example: isEqual({ a: undefined }, {}) returns false
 *
 * Any property that is an array will need to be sorted so that the order of the elements does not affect the comparison
 * The sorted Fields are: AttributeDefinitions, KeySchema, and GlobalSecondaryIndexes
 *
 * @param tableProperties table properties to sanitize
 * @returns sanitized table properties with array properties sorted
 */
export const sanitizeTableProperties = (tableProperties: TableComparisonProperties): TableComparisonProperties => {
  const tablePropertiesUndefinedRemoved: TableComparisonProperties = JSON.parse(JSON.stringify(tableProperties));
  if (tablePropertiesUndefinedRemoved.AttributeDefinitions) {
    // The typescript type allows for fields on AttributeDefinition, KeySchemaElement, and GlobalSecondaryIndex to be undefined.
    // But the docs state these fields as required so we can safely assume they will not be undefined

    // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_AttributeDefinition.html
    tablePropertiesUndefinedRemoved.AttributeDefinitions.sort((a, b) =>
      // AttributeName will never be the same
      (a.AttributeName ?? '').localeCompare(b.AttributeName ?? ''),
    );
  }

  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_KeySchemaElement.html
  const sortKeySchema = (a: KeySchemaElement, b: KeySchemaElement): number =>
    // AttributeName will never be the same
    (a.AttributeName ?? '').localeCompare(b.AttributeName ?? '');

  if (tablePropertiesUndefinedRemoved.KeySchema) {
    tablePropertiesUndefinedRemoved.KeySchema.sort(sortKeySchema);
  }

  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GlobalSecondaryIndex.html
  if (tablePropertiesUndefinedRemoved.GlobalSecondaryIndexes) {
    tablePropertiesUndefinedRemoved.GlobalSecondaryIndexes.sort((a, b) =>
      // IndexName will never be the same
      (a.IndexName ?? '').localeCompare(b.IndexName ?? ''),
    );

    // sort the KeySchema in each GSI
    tablePropertiesUndefinedRemoved.GlobalSecondaryIndexes.forEach((gsi) => {
      if (gsi.KeySchema) {
        gsi.KeySchema.sort(sortKeySchema);
      }
    });
  }

  return tablePropertiesUndefinedRemoved;
};
