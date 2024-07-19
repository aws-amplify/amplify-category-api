import { MappingTemplate } from "@aws-amplify/graphql-transformer-core";
import { MappingTemplateProvider } from "@aws-amplify/graphql-transformer-interfaces";
import { dedent } from 'ts-dedent';

export const verifySessionOwnerMappingTemplate = (): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
    const req = MappingTemplate.inlineTemplateFromString(dedent`
      export function request(ctx) {
        const { authFilter } = ctx.stash;

        const query = {
          expression: 'id = :id',
          expressionValues: util.dynamodb.toMapValues({
            ':id': ctx.args.sessionId
          })
        };

        const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));

        return {
          operation: 'Query',
          query,
          filter
        };
      }
      `);

    const res = MappingTemplate.inlineTemplateFromString(dedent`
      export function response(ctx) {
        if (ctx.error) {
          util.error(ctx.error.message, ctx.error.type);
        }
        if (ctx.result.items.length !== 0 && ctx.result.scannedCount === 1) {
          return ctx.result.items[0];
        } else if (ctx.result.items.legnth === 0 && ctx.result.scannedCount === 1) {
          util.unauthorized();
        }
        return null;
      }`);

    return { req, res };
  };