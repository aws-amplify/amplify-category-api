import { MappingTemplateType, S3MappingFunctionCodeProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';
import { FileAsset } from './file-asset';

export class S3MappingFunctionCode implements S3MappingFunctionCodeProvider {
  public readonly type = MappingTemplateType.S3_LOCATION;
  private asset?: FileAsset;
  private fileName: string;
  private filePath: string;

  constructor(fileName: string, filePath: string) {
    this.fileName = fileName;
    this.filePath = filePath;
  }

  bind(scope: Construct): FileAsset {
    if (!this.asset) {
      this.asset = new FileAsset(scope, `Code${this.fileName}`, {
        fileContent: this.filePath,
        fileName: this.fileName,
      });
    }
    return this.asset;
  }
}
