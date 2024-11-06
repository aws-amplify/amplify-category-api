import { LIST_CONVERSATIONS_INDEX_NAME } from '../graphql-types/name-values';
import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The definition of the init slot for the list conversations resolver.
 * This is used to set the index within the model generated list query.
 */
export const listConversationsInitFunctionDefinition: ResolverFunctionDefinition = createResolverFunctionDefinition({
  slotName: 'init',
  fileName: 'list-conversations-init-set-index-resolver-fn.template.js',
  generateTemplate: createS3AssetMappingTemplateGenerator('Query', 'list-conversations-init', (config) => config.field.name.value),
  substitutions: (config) => ({
    INDEX_NAME: LIST_CONVERSATIONS_INDEX_NAME,
    MODEL_QUERY_EXPRESSION: `{
      expression: '#typename = :typename',
      expressionNames: {
        '#typename': '__typename',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':typename': '${config.conversation.model.name.value}',
      }),
    }`,
    SORT_DIRECTION: 'DESC',
  }),
});
