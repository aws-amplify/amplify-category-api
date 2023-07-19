import { Construct } from 'constructs';

export interface TemplateProps {
  readonly fileContent: string;
  readonly fileName: string;
}

export type FileAsset = {
  readonly assetHash: string;
  readonly httpUrl: string;
  readonly s3BucketName: string;
  readonly s3ObjectKey: string;
  readonly s3Url: string;
};

export type FileAssetProvider = {
  generateAsset: (scope: Construct, id: string, props: TemplateProps) => FileAsset;
};

let fileAssetProvider: FileAssetProvider | undefined = undefined;

export const setFileAssetProvider = (provider: FileAssetProvider): void => {
  fileAssetProvider = provider;
};

export const getFileAssetProvider = (): FileAssetProvider => {
  if (!fileAssetProvider) {
    throw new Error('FileAssetProvider not set');
  }
  return fileAssetProvider;
};
