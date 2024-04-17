import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AssetProvider } from '../../internal';

describe('AssetProvider', () => {
  test('uses a unique directory for each asset manager', () => {
    const stack = new cdk.Stack();
    const mockConstruct1 = new Construct(stack, 'MockConstruct1');
    const assetProvider1 = new AssetProvider(mockConstruct1);

    const mockConstruct2 = new Construct(stack, 'MockConstruct2');
    const assetProvider2 = new AssetProvider(mockConstruct2);

    // disable ts to access private field
    // @ts-ignore
    expect(assetProvider1.tempAssetDir).not.toEqual(assetProvider2.tempAssetDir);
  });
});
