import { TableDescription } from '@aws-sdk/client-dynamodb';
import {
  getExpectedTableProperties,
  getImportedTableComparisonProperties,
  validateImportedTableProperties,
  TableComparisonProperties,
} from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/import-table';
import {
  extractTableInputFromEvent,
  toCreateTableInput,
} from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as ddbTableManagerLambda from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import { RequestType } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda-types';

jest.spyOn(ddbTableManagerLambda, 'getLambdaTags').mockReturnValue(
  Promise.resolve([
    { Key: 'key1', Value: 'value1' },
    { Key: 'key2', Value: 'value2' },
    { Key: 'key3', Value: 'value3' },
  ]),
);

describe('import-table', () => {
  test('getExpectedTableProperties', async () => {
    const mockEvent = {
      ServiceToken: 'mockServiceToken',
      ResponseURL: 'mockResponseURL',
      StackId: 'mockStackId',
      RequestId: 'mockRequestId',
      LogicalResourceId: 'mockLogicalResourceId',
      ResourceType: 'mockResourceType',
      RequestType: 'Create' as RequestType,
      ResourceProperties: {
        ServiceToken: 'mockServiceToken',
        tableName: 'mockTableName',
        attributeDefinitions: [
          {
            attributeName: 'todoId',
            attributeType: 'S',
          },
          {
            attributeName: 'name',
            attributeType: 'S',
          },
          {
            attributeName: 'name2',
            attributeType: 'S',
          },
        ],
        keySchema: [
          {
            attributeName: 'todoId',
            keyType: 'HASH',
          },
          {
            attributeName: 'name',
            keyType: 'RANGE',
          },
        ],
        globalSecondaryIndexes: [
          {
            indexName: 'byName2',
            keySchema: [
              {
                attributeName: 'name2',
                keyType: 'HASH',
              },
            ],
            projection: {
              projectionType: 'ALL',
            },
            provisionedThroughput: {
              readCapacityUnits: '5',
              writeCapacityUnits: '5',
            },
          },
        ],
        billingMode: 'PROVISIONED',
        provisionedThroughput: {
          readCapacityUnits: '5',
          writeCapacityUnits: '5',
        },
        sseSpecification: {
          sseEnabled: 'true',
        },
        streamSpecification: {
          streamViewType: 'NEW_AND_OLD_IMAGES',
        },
      },
    };

    const mockContext = {
      invokedFunctionArn: 'mockFunctionArn',
    };
    const tableDef = await extractTableInputFromEvent(mockEvent, mockContext);
    const createTableInput = toCreateTableInput(tableDef);
    const expectedTableProperties = getExpectedTableProperties(createTableInput);
    expect(expectedTableProperties).toMatchSnapshot();
  });

  describe('validateImportedTableProperties', () => {
    describe('matching properties', () => {
      test('AttributeDefinitions', () => {
        const actual: TableDescription = {
          AttributeDefinitions: [
            {
              AttributeName: 'todoId',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name2',
              AttributeType: 'S',
              // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
              foo: 'bar',
              baz: undefined,
            },
          ],
        };
        const expected: TableComparisonProperties = {
          AttributeDefinitions: [
            {
              AttributeName: 'todoId',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name2',
              AttributeType: 'S',
            },
          ],
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('KeySchema', () => {
        const actual: TableDescription = {
          KeySchema: [
            {
              AttributeName: 'todoId',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'name',
              KeyType: 'RANGE',
              // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
              foo: 'bar',
              baz: undefined,
            },
          ],
        };
        const expected: TableComparisonProperties = {
          KeySchema: [
            {
              AttributeName: 'todoId',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'name',
              KeyType: 'RANGE',
            },
          ],
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('GlobalSecondaryIndexes', () => {
        const actual: TableDescription = {
          GlobalSecondaryIndexes: [
            {
              IndexName: 'byName2',
              KeySchema: [
                {
                  AttributeName: 'name2',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
              // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
              foo: 'bar',
              baz: undefined,
            },
          ],
        };
        const expected: TableComparisonProperties = {
          GlobalSecondaryIndexes: [
            {
              IndexName: 'byName2',
              KeySchema: [
                {
                  AttributeName: 'name2',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            },
          ],
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('BillingModeSummary', () => {
        const actual: TableDescription = {
          BillingModeSummary: {
            BillingMode: 'PROVISIONED',
            // should be ignored
            LastUpdateToPayPerRequestDateTime: new Date(),
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
          },
        };
        const expected: TableComparisonProperties = {
          BillingModeSummary: {
            BillingMode: 'PROVISIONED',
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('ProvisionedThroughput', () => {
        const actual: TableDescription = {
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
            // should be ingnored
            LastDecreaseDateTime: new Date(),
            LastIncreaseDateTime: new Date(),
            NumberOfDecreasesToday: 0,
          },
        };
        const expected: TableComparisonProperties = {
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('StreamSpecification', () => {
        const actual: TableDescription = {
          StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
          },
        };
        const expected: TableComparisonProperties = {
          StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('SSEDescription', () => {
        const actual: TableDescription = {
          SSEDescription: {
            SSEType: 'KMS',
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
            // should be ignored
            Status: 'ENABLED',
          },
        };
        const expected: TableComparisonProperties = {
          SSEDescription: {
            SSEType: 'KMS',
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });

      test('DeletionProtectionEnabled', () => {
        const actual: TableDescription = {
          DeletionProtectionEnabled: true,
        };
        const expected: TableComparisonProperties = {
          DeletionProtectionEnabled: true,
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected)).not.toThrow();
      });
    });

    describe('non-matching properties', () => {
      test('AttributeDefinitions', () => {
        const actual: TableDescription = {
          AttributeDefinitions: [
            {
              AttributeName: 'todoId',
              AttributeType: 'S',
              // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
              foo: 'bar',
              baz: undefined,
            },
            {
              AttributeName: 'name',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name2',
              AttributeType: 'S',
            },
          ],
        };
        const expected: TableComparisonProperties = {
          AttributeDefinitions: [
            {
              AttributeName: 'todoId',
              AttributeType: 'S',
            },
            {
              AttributeName: 'differentName',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name2',
              AttributeType: 'S',
            },
          ],
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          AttributeDefinitions does not match the expected value.
          Imported Value: [{\\"AttributeName\\":\\"todoId\\",\\"AttributeType\\":\\"S\\"},{\\"AttributeName\\":\\"name\\",\\"AttributeType\\":\\"S\\"},{\\"AttributeName\\":\\"name2\\",\\"AttributeType\\":\\"S\\"}]
          Expected: [{\\"AttributeName\\":\\"todoId\\",\\"AttributeType\\":\\"S\\"},{\\"AttributeName\\":\\"differentName\\",\\"AttributeType\\":\\"S\\"},{\\"AttributeName\\":\\"name2\\",\\"AttributeType\\":\\"S\\"}]"
        `);
      });

      test('KeySchema', () => {
        const actual: TableDescription = {
          KeySchema: [
            {
              AttributeName: 'todoId',
              KeyType: 'HASH',
              // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
              foo: 'bar',
              baz: undefined,
            },
            {
              AttributeName: 'name',
              KeyType: 'RANGE',
            },
          ],
        };
        const expected: TableComparisonProperties = {
          KeySchema: [
            {
              AttributeName: 'todoId',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'differentName',
              KeyType: 'RANGE',
            },
          ],
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          KeySchema does not match the expected value.
          Imported Value: [{\\"AttributeName\\":\\"todoId\\",\\"KeyType\\":\\"HASH\\"},{\\"AttributeName\\":\\"name\\",\\"KeyType\\":\\"RANGE\\"}]
          Expected: [{\\"AttributeName\\":\\"todoId\\",\\"KeyType\\":\\"HASH\\"},{\\"AttributeName\\":\\"differentName\\",\\"KeyType\\":\\"RANGE\\"}]"
        `);
      });

      test('GlobalSecondaryIndexes', () => {
        const actual: TableDescription = {
          GlobalSecondaryIndexes: [
            {
              IndexName: 'byName2',
              KeySchema: [
                {
                  AttributeName: 'name2',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
              // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
              foo: 'bar',
              baz: undefined,
            },
          ],
        };
        const expected: TableComparisonProperties = {
          GlobalSecondaryIndexes: [
            {
              IndexName: 'byName2',
              KeySchema: [
                {
                  AttributeName: 'name2',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 10,
              },
            },
          ],
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          GlobalSecondaryIndexes does not match the expected value.
          Imported Value: [{\\"IndexName\\":\\"byName2\\",\\"KeySchema\\":[{\\"AttributeName\\":\\"name2\\",\\"KeyType\\":\\"HASH\\"}],\\"Projection\\":{\\"ProjectionType\\":\\"ALL\\"},\\"ProvisionedThroughput\\":{\\"ReadCapacityUnits\\":5,\\"WriteCapacityUnits\\":5}}]
          Expected: [{\\"IndexName\\":\\"byName2\\",\\"KeySchema\\":[{\\"AttributeName\\":\\"name2\\",\\"KeyType\\":\\"HASH\\"}],\\"Projection\\":{\\"ProjectionType\\":\\"ALL\\"},\\"ProvisionedThroughput\\":{\\"ReadCapacityUnits\\":5,\\"WriteCapacityUnits\\":10}}]"
        `);
      });

      test('BillingModeSummary', () => {
        const actual: TableDescription = {
          BillingModeSummary: {
            BillingMode: 'PROVISIONED',
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
            // should be ignored
            LastUpdateToPayPerRequestDateTime: new Date(),
          },
        };
        const expected: TableComparisonProperties = {
          BillingModeSummary: {
            BillingMode: 'PAY_PER_REQUEST',
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          BillingModeSummary does not match the expected value.
          Imported Value: {\\"BillingMode\\":\\"PROVISIONED\\"}
          Expected: {\\"BillingMode\\":\\"PAY_PER_REQUEST\\"}"
        `);
      });

      test('ProvisionedThroughput', () => {
        const actual: TableDescription = {
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
            // should be ingnored
            LastDecreaseDateTime: new Date(),
            LastIncreaseDateTime: new Date(),
            NumberOfDecreasesToday: 0,
          },
        };
        const expected: TableComparisonProperties = {
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 10,
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          ProvisionedThroughput does not match the expected value.
          Imported Value: {\\"ReadCapacityUnits\\":5,\\"WriteCapacityUnits\\":5}
          Expected: {\\"ReadCapacityUnits\\":5,\\"WriteCapacityUnits\\":10}"
        `);
      });

      test('StreamSpecification', () => {
        const actual: TableDescription = {
          StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
            // @ts-expect-error Attribute should be ignored in comparison. AWS SDK may add additional fields in the future
            foo: 'bar',
            baz: undefined,
          },
        };
        const expected: TableComparisonProperties = {
          StreamSpecification: {
            StreamEnabled: false,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          StreamSpecification does not match the expected value.
          Imported Value: {\\"StreamEnabled\\":true,\\"StreamViewType\\":\\"NEW_AND_OLD_IMAGES\\"}
          Expected: {\\"StreamEnabled\\":false,\\"StreamViewType\\":\\"NEW_AND_OLD_IMAGES\\"}"
        `);
      });

      test('SSEDescription', () => {
        const actual: TableDescription = {
          SSEDescription: undefined,
        };
        const expected: TableComparisonProperties = {
          SSEDescription: {
            SSEType: 'KMS',
          },
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          SSEDescription does not match the expected value.
          Imported Value: undefined
          Expected: {\\"SSEType\\":\\"KMS\\"}"
        `);
      });

      test('DeletionProtectionEnabled', () => {
        const actual: TableDescription = {
          DeletionProtectionEnabled: true,
        };
        const expected: TableComparisonProperties = {
          DeletionProtectionEnabled: false,
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          DeletionProtectionEnabled does not match the expected value.
          Imported Value: true
          Expected: false"
        `);
      });

      test('multiple errors', () => {
        const actual: TableDescription = {
          SSEDescription: undefined,
          DeletionProtectionEnabled: true,
        };
        const expected: TableComparisonProperties = {
          SSEDescription: {
            SSEType: 'KMS',
          },
          DeletionProtectionEnabled: false,
        };

        expect(() => validateImportedTableProperties(getImportedTableComparisonProperties(actual), expected))
          .toThrowErrorMatchingInlineSnapshot(`
          "Imported table properties did not match the expected table properties.
          SSEDescription does not match the expected value.
          Imported Value: undefined
          Expected: {\\"SSEType\\":\\"KMS\\"}
          DeletionProtectionEnabled does not match the expected value.
          Imported Value: true
          Expected: false"
        `);
      });
    });
  });
});
