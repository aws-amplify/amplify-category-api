import * as crypto from 'crypto';
import { MappingTemplateType, S3MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';
import { FileAsset, getFileAssetProvider } from './file-asset-provider';

export class S3MappingTemplate implements S3MappingTemplateProvider {
  private content: string;
  private name: string;
  private asset?: FileAsset;
  public readonly type = MappingTemplateType.S3_LOCATION;

  static fromInlineTemplate(code: string, templateName?: string): S3MappingTemplate {
    return new S3MappingTemplate(code, templateName);
  }

  constructor(content: string, name?: string) {
    this.content = content;
    const assetHash = crypto.createHash('sha256').update(content).digest('hex');
    this.name = name || `mapping-template-${assetHash}.vtl`;
  }

  bind(scope: Construct): string {
    // If the same AssetCode is used multiple times, retain only the first instantiation.
    if (!this.asset) {
      this.asset = getFileAssetProvider().generateAsset(scope, `Template${this.name}`, {
        fileContent: this.content,
        fileName: this.name,
      });
    }
    return this.asset.s3Url;
  }

  /**
   * get the resolver content
   * @returns string
   */
  getTemplateHash(): string {
    return crypto.createHash('sha256').update(this.content).digest('base64');
  }

  substituteValues(values: Record<string, string | number>): void {
    let { name } = this;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`({${key}})`, 'g');
      name = name.replace(regex, `${value}`);
    });
    this.name = name;
  }
}
