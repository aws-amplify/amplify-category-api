import { Stack } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { getGlobalSecondaryIndexes } from '../../utils/schema-utils';

describe('getGlobalSecondaryIndexes', () => {
  it('reads the indexes off a real DynamoDB L2 Table regardless of the installed aws-cdk-lib field name', () => {
    const table = new Table(new Stack(), 'TestTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });
    table.addGlobalSecondaryIndex({
      indexName: 'byName',
      partitionKey: { name: 'name', type: AttributeType.STRING },
    });

    const indexes = getGlobalSecondaryIndexes(table);

    expect(indexes).toBeDefined();
    expect(indexes.find((gsi: any) => gsi.indexName === 'byName')).toBeDefined();
  });

  it('returns the private _globalSecondaryIndexes ArrayBox when present', () => {
    const indexes = [{ indexName: 'byName', keySchema: [{ attributeName: 'name', keyType: 'HASH' }] }];

    expect(getGlobalSecondaryIndexes({ _globalSecondaryIndexes: indexes })).toBe(indexes);
  });

  it('falls back to the public globalSecondaryIndexes array (Amplify managed table)', () => {
    const indexes = [{ indexName: 'byOwner', keySchema: [{ attributeName: 'owner', keyType: 'HASH' }] }];

    expect(getGlobalSecondaryIndexes({ globalSecondaryIndexes: indexes })).toBe(indexes);
  });

  it('prefers _globalSecondaryIndexes when both fields are populated', () => {
    const renamed = [{ indexName: 'renamed' }];
    const legacy = [{ indexName: 'legacy' }];

    expect(getGlobalSecondaryIndexes({ _globalSecondaryIndexes: renamed, globalSecondaryIndexes: legacy })).toBe(renamed);
  });

  it('returns undefined when neither field is present', () => {
    expect(getGlobalSecondaryIndexes({})).toBeUndefined();
  });
});
