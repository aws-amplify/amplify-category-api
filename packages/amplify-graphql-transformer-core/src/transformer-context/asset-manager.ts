import { AssetManagerProvider, AssetProvider, S3Asset, AssetProps } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';

export class AssetManager implements AssetManagerProvider {
  private assetProvider: AssetProvider | undefined;

  public createAsset(scope: Construct, name: string, props: AssetProps): S3Asset {
    return this.getAssetProvider().provide(scope, name, props);
  }

  private getAssetProvider(): AssetProvider {
    if (!this.assetProvider) {
      throw new Error('AssetProvider not initialized');
    }
    return this.assetProvider;
  }

  public setAssetProvider(provider: AssetProvider): void {
    this.assetProvider = provider;
  }
}
