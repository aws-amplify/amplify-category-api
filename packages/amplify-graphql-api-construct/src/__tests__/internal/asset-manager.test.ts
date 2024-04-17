import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AssetManager } from '../../internal';

describe('assetManager', () => {
  test('uses a unique directory for each asset manager', () => {
    const stack = new cdk.Stack();
    const mockConstruct1 = new Construct(stack, 'MockConstruct1');
    const assetManager1 = new AssetManager(mockConstruct1);

    const mockConstruct2 = new Construct(stack, 'MockConstruct2');
    const assetManager2 = new AssetManager(mockConstruct2);

    // disable ts to access private field
    // @ts-ignore
    expect(assetManager1.tempAssetDir).not.toEqual(assetManager2.tempAssetDir);
  });
});
