import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';

export const writeMessageToTableMappingTemplate = (fieldName: string): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    import { util } from '@aws-appsync/utils'
    import * as ddb from '@aws-appsync/utils/dynamodb'

    export function request(ctx) {
      const args = ctx.stash.transformedArgs ?? ctx.args;
      const defaultValues = ctx.stash.defaultValues ?? {};
      const message = {
          __typename: 'ConversationMessage${fieldName}',
          role: 'user',
          ...args,
          ...defaultValues,
      };
      const id = ctx.stash.defaultValues.id;

      return ddb.put({ key: { id }, item: message });
    }
    `);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
      } else {
        return ctx.result;
      }
    }`);

  return { req, res };
};
