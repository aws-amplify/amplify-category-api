import { S3MappingTemplate } from './s3-mapping-template';
import { InlineTemplate } from './inline-template';

export class MappingTemplate {
  static inlineTemplateFromString(template: string): InlineTemplate {
    return new InlineTemplate(template);
  }

  static s3MappingTemplateFromString(template: string, templateName: string): S3MappingTemplate {
    const templatePrefix = 'resolvers';
    return new S3MappingTemplate(template, `${templatePrefix}/${templateName}`);
  }
}
