import * as path from 'path';
import * as os from 'os';
import { NestedStackProvider, FileAssetProvider, FileAsset, TemplateProps } from '@aws-amplify/graphql-transformer-core';
import { NestedStack, Stack } from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import * as fs from 'fs-extra';

export const fileAssetProvider: FileAssetProvider = {
  generateAsset: (scope: Construct, id: string, props: TemplateProps): FileAsset => {
    const asset = new Asset(scope, id, {
      path: assetManager.addAsset(props.fileName, props.fileContent),
    });
    return {
      assetHash: asset.assetHash,
      httpUrl: asset.httpUrl,
      s3BucketName: asset.s3BucketName,
      s3ObjectKey: asset.s3ObjectKey,
      s3Url: asset.s3ObjectUrl,
    };
  },
};

export const nestedStackProvider: NestedStackProvider = {
  generateNestedStack: (scope: Construct, name: string): Stack => new NestedStack(scope, name),
};

class AssetManager {
  public readonly assets;
  public readonly tempAssetDir;

  constructor() {
    this.assets = new Map<string, string>();
    this.tempAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer-assets'));
  }

  addAsset(fileName: string, contents: string): string {
    this.assets.set(fileName, contents);
    const filePath = path.join(this.tempAssetDir, fileName);
    const fileDirName = path.dirname(filePath);
    if (!fs.existsSync(fileDirName)) {
      fs.mkdirSync(fileDirName, { recursive: true });
    }
    fs.writeFileSync(filePath, contents);
    return filePath;
  }
}

const assetManager = new AssetManager();
