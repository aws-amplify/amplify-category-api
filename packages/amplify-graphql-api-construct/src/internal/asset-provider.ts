import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AssetProps, S3Asset, AssetProvider as AssetProviderInterface } from '@aws-amplify/graphql-transformer-interfaces';

const TEMP_PREFIX = 'transformer-assets';
const FUNCTION_PREFIX = 'functions';
const RESOLVER_PREFIX = 'resolvers';

/**
 * The asset provider bridges the gap between creation of file assets in the transformer (which provide a name+contents tuple)
 * with the path method which is used in CDK.
 * The CDK S3 asset require the contents to be written to the file system first.
 * The asset provider writes to a temporary directory before creating the CDK S3 asset.
 *
 */
export class AssetProvider implements AssetProviderInterface {
  private readonly tempAssetDir: string;
  public readonly resolverAssets: Record<string, string> = {};

  constructor(scope: Construct) {
    this.tempAssetDir = cdk.FileSystem.mkdtemp(`${TEMP_PREFIX}-${scope.node.addr}`);
  }

  /**
   * Creates a new CDK S3 asset. The file contents in assetProps is first stored in a temporary file that is referenced by the CDK S3 asset.
   * @param assetScope the parent of the asset
   * @param assetId unique ID for CDK S3 asset
   * @param assetProps name and contents of file to be added to CDK S3 asset
   * @returns the CDK S3 asset
   */
  public provide(assetScope: Construct, assetId: string, assetProps: AssetProps): S3Asset {
    return new Asset(assetScope, assetId, { path: this.addAsset(assetProps.fileName, assetProps.fileContent) });
  }

  private addAsset(fileName: string, contents: string): string {
    this.trackResolverAsset(fileName, contents);
    const writableContents = this.isContentsAReference(fileName) ? this.dereferenceContents(contents) : contents;
    const filePath = path.join(this.tempAssetDir, fileName);
    const fileDirName = path.dirname(filePath);
    if (!fs.existsSync(fileDirName)) {
      fs.mkdirSync(fileDirName, { recursive: true });
    }
    fs.writeFileSync(filePath, writableContents);
    return filePath;
  }

  private isContentsAReference(fileName: string): boolean {
    return fileName.startsWith(FUNCTION_PREFIX);
  }

  private dereferenceContents(contents: string): Buffer {
    return fs.readFileSync(contents);
  }

  private trackResolverAsset(fileName: string, contents: string): void {
    if (fileName.startsWith(RESOLVER_PREFIX)) {
      const resolverFileName = fileName.split('/')[1];
      this.resolverAssets[resolverFileName] = contents;
    }
  }
}
