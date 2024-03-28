import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

const TEMP_PREFIX = 'transformer-assets';
const FUNCTION_PREFIX = 'functions';
const RESOLVER_PREFIX = 'resolvers';

/**
 * The asset manager bridges the gap between creation of file assets in the transformer (which provide a name+contents tuple)
 * with the path method which is used in CDK.
 */
export class AssetManager {
  private readonly tempAssetDir: string;
  public readonly resolverAssets: Record<string, string> = {};

  constructor(scope: Construct) {
    this.tempAssetDir = cdk.FileSystem.mkdtemp(`${TEMP_PREFIX}-${scope.node.addr}`);
  }

  public addAsset(fileName: string, contents: string): string {
    this.trackResolverAsset(fileName, contents);
    const writableContents = this.isContentsAReference(fileName) ? this.dereferenceContents(contents) : contents;
    const filePath = path.join(this.tempAssetDir, fileName);
    const fileDirName = path.dirname(filePath);
    if (!fs.existsSync(fileDirName)) {
      fs.mkdirSync(fileDirName, { recursive: true });
    }
    fs.writeFileSync(filePath, writableContents);
    console.log(filePath);
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
