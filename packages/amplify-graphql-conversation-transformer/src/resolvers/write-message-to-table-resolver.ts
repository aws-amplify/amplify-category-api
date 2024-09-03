import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';
import { JSResolverFunctionProvider } from './js-resolver-function-provider';

export const writeMessageToTableMappingTemplate = (fieldName: string): JSResolverFunctionProvider => {
  const req = createWriteMessageToTableRequestFunction(fieldName);
  const res = createWriteMessageToTableResponseFunction();
  return { req, res };
};

const createWriteMessageToTableRequestFunction = (fieldName: string): MappingTemplateProvider => {
  const requestFunctionString = `
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
    `;

  return MappingTemplate.inlineTemplateFromString(dedent(requestFunctionString));
};

const createWriteMessageToTableResponseFunction = (): MappingTemplateProvider => {
  const responseFunctionString = `
    export function response(ctx) {
      if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
      } else {
        return ctx.result;
      }
    }
    `;

  return MappingTemplate.inlineTemplateFromString(dedent(responseFunctionString));
};
