import { InlineMappingTemplateProvider, MappingTemplateType } from '@aws-amplify/graphql-transformer-interfaces';
import * as crypto from 'crypto';

export class InlineTemplate implements InlineMappingTemplateProvider {
  public readonly type = MappingTemplateType.INLINE;

  constructor(private content: string) {}

  bind(): string {
    return this.content;
  }

  /**
   *  get the resolver inline template content
   * @returns string
   */
  getTemplateHash(): string {
    return crypto.createHash('sha256').update(this.content).digest('base64');
  }
}
