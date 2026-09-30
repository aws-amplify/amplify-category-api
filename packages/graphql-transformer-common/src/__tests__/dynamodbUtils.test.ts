import { print } from 'graphql-mapping-template';
import { applyKeyConditionExpression, applyKeyExpressionForCompositeKey } from '../dynamodbUtils';

describe('applyKeyConditionExpression - single sort key', () => {
  const vtl = print(applyKeyConditionExpression('createdAt', 'S', 'modelQueryExpression'));

  it('guards against more than one operator on a single key (issue: one condition per key)', () => {
    // A counter is initialized and incremented once per supplied operator...
    expect(vtl).toContain('#set( $keyConditionOperatorCount = 0 )');
    expect(vtl).toContain('#set( $keyConditionOperatorCount = $keyConditionOperatorCount + 1 )');
    // ...and the request is failed BEFORE any DynamoDB call when more than one is present.
    expect(vtl).toContain('#if( $keyConditionOperatorCount > 1 )');
    expect(vtl).toContain('KeyConditionExpressions must only contain one condition per key');
    expect(vtl).toContain('InvalidArgumentsError');
  });

  it('counts every comparison operator the key-condition input can carry', () => {
    for (const op of ['beginsWith', 'between', 'eq', 'lt', 'le', 'gt', 'ge']) {
      expect(vtl).toContain(`#if( !$util.isNull($ctx.args.createdAt.${op}) )`);
    }
  });

  it('emits the guard before the key-condition branches so a single operator still applies unchanged', () => {
    const guardIdx = vtl.indexOf('$keyConditionOperatorCount > 1');
    const firstBranchIdx = vtl.indexOf('AND begins_with(#sortKey, :sortKey)');
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(firstBranchIdx).toBeGreaterThanOrEqual(0);
    expect(guardIdx).toBeLessThan(firstBranchIdx);
  });
});

describe('applyKeyExpressionForCompositeKey - composite sort key', () => {
  // keys = [hashKey, sortKey1, sortKey2] exercises applyCompositeKeyConditionExpression.
  const vtl = print(applyKeyExpressionForCompositeKey(['pk', 'status', 'createdAt'], ['S', 'S', 'S'], 'modelQueryExpression')!);

  it('also guards the composite sort-key argument against multiple operators', () => {
    expect(vtl).toContain('#set( $keyConditionOperatorCount = 0 )');
    expect(vtl).toContain('#if( $keyConditionOperatorCount > 1 )');
    expect(vtl).toContain('KeyConditionExpressions must only contain one condition per key');
    expect(vtl).toContain('InvalidArgumentsError');
  });
});
