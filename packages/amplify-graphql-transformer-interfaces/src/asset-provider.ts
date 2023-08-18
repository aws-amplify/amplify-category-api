import { Construct } from 'constructs';

export type AssetProps = {
  readonly fileContent: string;
  readonly fileName: string;
};

export type S3Asset = {
  assetHash: string;
  httpUrl: string;
  s3BucketName: string;
  s3ObjectKey: string;
  s3ObjectUrl: string;
};

export type AssetProvider = {
  provide: (scope: Construct, name: string, props: AssetProps) => S3Asset;
};
