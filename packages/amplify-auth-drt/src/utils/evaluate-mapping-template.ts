import {
  AppSyncClient,
  EvaluateMappingTemplateCommand,
  EvaluateMappingTemplateCommandInput,
  EvaluateMappingTemplateCommandOutput,
} from '@aws-sdk/client-appsync';
import { AppSyncContext } from './appsync-context';

// TODO: Migrate away from this to th einternal https://code.amazon.com/packages/AWSDeepDishMappingTemplateTestEvaluator/trees/mainline to
// evaluate these locally

export interface EvaluateMappingTemplateOptions {
  context: AppSyncContext;
  region: string;
  template: string;
}

export const evaluateMappingTemplate = async (options: EvaluateMappingTemplateOptions): Promise<EvaluateMappingTemplateCommandOutput> => {
  const { context, region, template } = options;
  const client = new AppSyncClient({ region });
  const input: EvaluateMappingTemplateCommandInput = {
    template,
    context: JSON.stringify(context),
  };
  const command = new EvaluateMappingTemplateCommand(input);
  const result = await client.send(command);
  return result;
};
