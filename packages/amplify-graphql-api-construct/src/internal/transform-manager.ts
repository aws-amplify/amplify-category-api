import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';

/**
 * The asset manager bridges the gap between creation of file assets in the transformer (which provide a name+contents tuple)
 * with the path method which is used in CDK.
 */
export class AssetManager {
  private readonly tempAssetDir: string = cdk.FileSystem.mkdtemp('transformer-assets');

  public addAsset(fileName: string, contents: string): string {
    const filePath = path.join(this.tempAssetDir, fileName);
    const fileDirName = path.dirname(filePath);
    if (!fs.existsSync(fileDirName)) {
      fs.mkdirSync(fileDirName, { recursive: true });
    }
    fs.writeFileSync(filePath, contents);
    return filePath;
  }
}
