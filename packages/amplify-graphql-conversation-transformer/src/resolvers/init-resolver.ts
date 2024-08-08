import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';

export const initMappingTemplate = (): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
      export function request(ctx) {
        ctx.stash.defaultValues = ctx.stash.defaultValues ?? {};
        ctx.stash.defaultValues.id = util.autoId();
        const createdAt = util.time.nowISO8601();
        ctx.stash.defaultValues.createdAt = createdAt;
        ctx.stash.defaultValues.updatedAt = createdAt;
        return {
          version: '2018-05-09',
          payload: {}
        };
      }`);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
      export function response(ctx) {
        return {};
      }`);

  return { req, res };
};
