import * as crypto from 'crypto';
import { FileAssetPackaging, IAsset } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { TransformerStackSythesizer, findRootStack } from '../stacks';
import { assetManager } from './asset-manager';

export interface TemplateProps {
  readonly fileContent: string;
  readonly fileName: string;
}

export class FileAsset extends Construct implements IAsset {
  public readonly assetHash: string;
  public readonly httpUrl: string;
  public readonly s3BucketName: string;
  public readonly s3ObjectKey: string;
  public readonly s3Url: string;

  constructor(scope: Construct, id: string, props: TemplateProps) {
    super(scope, id);

    const rootStack = findRootStack(scope);
    const sythesizer = rootStack.synthesizer;

    // Check the constructor name instead of using 'instanceof' because the latter does not work
    // with copies of the class, which happens with custom transformers.
    // See: https://github.com/aws-amplify/amplify-cli/issues/9362
    if (sythesizer.constructor.name === TransformerStackSythesizer.name) {
      // TODO: Do we need to do anything special to track these otherwise?
      (sythesizer as TransformerStackSythesizer).setMappingTemplates(props.fileName, props.fileContent);
      this.assetHash = crypto.createHash('sha256').update(props.fileContent).digest('hex');
      const asset = sythesizer.addFileAsset({
        fileName: props.fileName,
        packaging: FileAssetPackaging.FILE,
        sourceHash: this.assetHash,
      });
      this.httpUrl = asset.httpUrl;
      this.s3BucketName = asset.bucketName;
      this.s3ObjectKey = asset.objectKey;
      this.s3Url = asset.s3ObjectUrl;
    } else {
      const asset = new Asset(scope, `${id}-asset`, {
        path: assetManager.addAsset(props.fileName, props.fileContent),
      });
      this.httpUrl = asset.httpUrl;
      this.s3BucketName = asset.s3BucketName;
      this.s3ObjectKey = asset.s3ObjectKey;
      this.s3Url = asset.s3ObjectUrl;
      this.assetHash = asset.assetHash;
    }
  }
}
