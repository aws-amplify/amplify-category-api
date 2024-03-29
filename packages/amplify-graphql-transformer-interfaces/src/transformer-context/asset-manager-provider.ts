import { Construct } from 'constructs';
import { AssetProvider, AssetProps, S3Asset } from '../asset-provider';

export interface AssetManagerProvider {
  createAsset: (scope: Construct, name: string, props: AssetProps) => S3Asset;
  setAssetProvider: (provider: AssetProvider) => void;
}
