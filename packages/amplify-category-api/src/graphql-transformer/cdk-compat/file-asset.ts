import * as crypto from 'crypto';
import { FileAssetPackaging, IAsset } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TemplateProps } from '@aws-amplify/graphql-transformer-core';
import { findRootStack } from './stack-utils';
import { TransformerStackSythesizer,  } from '.';

export class AmplifyFileAsset extends Construct implements IAsset {
  public readonly assetHash: string;
  public readonly httpUrl: string;
  public readonly s3BucketName: string;
  public readonly s3ObjectKey: string;
  public readonly s3Url: string;

  constructor(scope: Construct, id: string, props: TemplateProps) {
    super(scope, id);

    const rootStack = findRootStack(scope);
    const sythesizer = rootStack.synthesizer;

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
  }
}
