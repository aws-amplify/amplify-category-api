import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
import { AppSyncContext } from './appsync-context';

const APPSYNC_CONTEXT_KEY = 'APPSYNC_CONTEXT';

export interface MergeTemplateOptions {
  api: AmplifyGraphqlApi;
  fieldName: string;
  typeName: string;
}

/**
 * Merge the function slots of an AmplifyGraphqlApi into a single template that can be evaluated with AppSync's EvaluateMappingTemplate
 * command. Decorates the template with an additional statement to dump the `$ctx` variable so it can be inspected by tests.
 */
export const mergeTemplate = (options: MergeTemplateOptions): string => {
  const { api, fieldName, typeName } = options;

  const templates = api.generatedFunctionSlots.filter((fn) => fn.typeName === typeName && fn.fieldName === fieldName);
  let mergedTemplate = templates.reduce((acc, curr) => `${acc}\n${curr.function.requestMappingTemplate}`, '');

  const dumpContextSnippet = `{"${APPSYNC_CONTEXT_KEY}": $util.toJson($ctx)}`;
  mergedTemplate = `${mergedTemplate}\n${dumpContextSnippet}`;

  return mergedTemplate;
};

/**
 * Extract the parsed AppSyncContext from an EvaluateMappingTemplate result. The result must have been enhanced with the `dumpContext`
 * snippet (which happens automatically by invoking {@link mergeTemplate}).
 *
 * This method expects the `appSyncContext` field to be the last line of the evaluated template
 */
export const extractContextFromMappingResult = (result: string): AppSyncContext => {
  const lines = result.split('\n');
  if (!lines || lines.length === 0) {
    throw new Error('Empty result');
  }
  const lastLine = lines[lines.length - 1];
  const obj: any = JSON.parse(lastLine);
  const appSyncContext: AppSyncContext = obj[APPSYNC_CONTEXT_KEY];
  return appSyncContext;
};
