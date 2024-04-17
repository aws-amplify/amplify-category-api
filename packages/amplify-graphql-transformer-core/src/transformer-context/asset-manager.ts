import { AssetManagerProvider, AssetProvider, S3Asset, AssetProps } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';

/**
 * Uses the asset provider to create CDK S3 Assets.
 * The transformers produce outputs as in memory name and contents tuple.
 * CDK S3 Asset requires the asset to be written to the file system first.
 * The asset provider handles this with a temporary file.
 */
export class AssetManager implements AssetManagerProvider {
  private assetProvider: AssetProvider;

  constructor(assetProvider: AssetProvider) {
    this.assetProvider = assetProvider;
  }

  /**
   * Store file contents as an CDK S3 asset.
   * @param scope the parent of the CDK S3 asset
   * @param name the unique name of the CDK S3 asset
   * @param assetProps name and contents of file to be added to CDK S3 asset
   * @returns the CDK S3 asset
   */
  public createAsset(scope: Construct, name: string, props: AssetProps): S3Asset {
    return this.assetProvider.provide(scope, name, props);
  }
}
