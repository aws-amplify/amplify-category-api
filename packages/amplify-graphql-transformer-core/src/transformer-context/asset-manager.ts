import { AssetManagerProvider, AssetProvider, S3Asset, AssetProps } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';

export class AssetManager implements AssetManagerProvider {
  private assetProvider: AssetProvider;

  constructor(assetProvider: AssetProvider) {
    this.assetProvider = assetProvider;
  }

  public createAsset(scope: Construct, name: string, props: AssetProps): S3Asset {
    return this.assetProvider.provide(scope, name, props);
  }
}
